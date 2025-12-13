"""
Mistral Career Predictor Module
Uses Mistral LLM for career predictions with RAG context
"""

import logging
import os
import time
from typing import Dict, Tuple, Optional
from mistralai.client import MistralClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MistralCareerPredictor:
    """Career prediction using Mistral LLM with RAG context"""
    
    def __init__(self, 
                 api_key: Optional[str] = None,
                 model: str = "mistral-large-latest",
                 rag_pipeline=None):
        """
        Initialize Mistral predictor
        
        Args:
            api_key: Primary Mistral API key (or from MISTRAL_API_KEY env var)
            model: Mistral model name
            rag_pipeline: RAG pipeline instance for context retrieval
        """
        # Support primary + secondary API keys with fallback
        primary_key = api_key or os.getenv("MISTRAL_API_KEY")
        secondary_key = os.getenv("MISTRAL_API_KEY2")

        if not primary_key and not secondary_key:
            raise ValueError("No Mistral API key provided. Set MISTRAL_API_KEY (and optionally MISTRAL_API_KEY2).")

        self.api_keys = []
        if primary_key:
            self.api_keys.append(primary_key)
        if secondary_key and secondary_key != primary_key:
            self.api_keys.append(secondary_key)

        self.model = model
        # Create a client per key in order; index 0 is primary
        self.clients = [MistralClient(api_key=k) for k in self.api_keys]
        self.rag_pipeline = rag_pipeline
        
        logger.info(
            f"Initialized Mistral predictor with model: {model} "
            f"using {len(self.api_keys)} API key(s) (primary + fallback)"
        )

    def _chat_with_key_fallback(self, messages, temperature: float = 0.7):
        """
        Call Mistral chat API, trying primary key first and falling back to
        MISTRAL_API_KEY2 on rate limits or other API errors.
        """
        last_error: Optional[Exception] = None

        for idx, client in enumerate(self.clients):
            key_label = "primary" if idx == 0 else f"fallback_{idx}"
            try:
                return client.chat(
                    messages=messages,
                    model=self.model,
                    temperature=temperature,
                )
            except Exception as e:
                last_error = e
                error_msg = str(e).lower()
                logger.warning(f"Mistral {key_label} key failed: {e}")

                # If there is another key to try, and this looks like an API-level error
                # (incl. rate limit / quota), continue to next key.
                is_rate_limit = "rate limit" in error_msg or "429" in error_msg or "quota" in error_msg
                is_api_error = "http" in error_msg or "api" in error_msg or "unauthorized" in error_msg

                if idx < len(self.clients) - 1 and (is_rate_limit or is_api_error):
                    logger.info(f"Trying next Mistral API key after {key_label} failure...")
                    continue

                # Otherwise, propagate and let caller's retry/fallback handle it
                break

        # If we get here, all keys failed
        if last_error:
            raise last_error
        raise RuntimeError("Mistral chat failed: no clients available")
    
    def predict_domain(self, profile: Dict, stage1_answers: Dict) -> Tuple[str, float, str]:
        """
        Predict career domain from Stage 1 answers
        
        Args:
            profile: User profile dictionary
            stage1_answers: Stage 1 question answers
            
        Returns:
            Tuple of (predicted_domain, confidence, reasoning)
        """
        # Build prompt
        profile_text = self._format_profile(profile)
        answers_text = self._format_answers(stage1_answers)
        
        # Get RAG context if available
        rag_context = ""
        if self.rag_pipeline:
            try:
                # Retrieve relevant domain information
                query = f"career domains: computer technology, medical, business, engineering, arts, sports"
                retrieved = self.rag_pipeline.retrieve(query, k=3)
                if retrieved:
                    rag_context = "\n\nRelevant Career Domain Information:\n"
                    for doc in retrieved:
                        if doc["type"] == "domain":
                            rag_context += f"- {doc['name']}: {doc['content'][:500]}...\n"
            except Exception as e:
                logger.warning(f"Error retrieving RAG context: {e}")
        
        prompt = f"""You are a career counselor analyzing a user's profile and Stage 1 questionnaire answers to predict their most suitable career domain.

User Profile:
{profile_text}

Stage 1 Answers:
{answers_text}

{rag_context}

Based on the profile and answers, predict the most suitable career domain from these options:
- computer_technology
- medical
- business
- engineering
- arts
- sports

Respond in this exact format:
DOMAIN: <domain_name>
CONFIDENCE: <confidence_score_0.0_to_0.9>
REASONING: <detailed_explanation_of_why_this_domain_matches>

Important: Confidence should be realistic (typically 0.50-0.85, maximum 0.90). Consider the strength of alignment between the user's profile/answers and the domain characteristics."""
        
        # Retry logic for network errors
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = self._chat_with_key_fallback(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                )
                
                result_text = response.choices[0].message.content
                
                # Parse response
                domain, confidence, reasoning = self._parse_prediction_response(result_text)
                
                # Cap confidence at 0.90
                confidence = min(confidence, 0.90)
                
                logger.info(f"Predicted domain: {domain} (confidence: {confidence:.2f})")
                return domain, confidence, reasoning
                
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {error_msg}")
                
                # Check if it's a network error
                if "getaddrinfo" in error_msg or "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        logger.error(f"Network error after {max_retries} attempts: {error_msg}")
                        # Fallback prediction based on answers
                        return self._fallback_domain_prediction(stage1_answers), 0.70, f"Network error: Using fallback prediction. Please check your internet connection."
                else:
                    # Non-network error, return fallback immediately
                    logger.error(f"Error in domain prediction: {error_msg}")
                    return self._fallback_domain_prediction(stage1_answers), 0.70, f"Error: {error_msg}. Using fallback prediction."
        
        # Final fallback
        return self._fallback_domain_prediction(stage1_answers), 0.70, "Unable to connect to Mistral API. Using fallback prediction."
    
    def predict_career(self, 
                      profile: Dict, 
                      stage1_answers: Dict,
                      stage2_answers: Dict,
                      predicted_domain: str) -> Tuple[str, float, str]:
        """
        Predict specific career from Stage 2 answers
        
        Args:
            profile: User profile dictionary
            stage1_answers: Stage 1 question answers
            stage2_answers: Stage 2 question answers
            predicted_domain: Predicted domain from Stage 1
            
        Returns:
            Tuple of (predicted_career, confidence, reasoning)
        """
        # Build prompt
        profile_text = self._format_profile(profile)
        stage1_text = self._format_answers(stage1_answers)
        stage2_text = self._format_answers(stage2_answers)
        
        # Get RAG context for domain and careers
        rag_context = ""
        if self.rag_pipeline:
            try:
                # Get domain context
                domain_context = self.rag_pipeline.get_context_for_domain(predicted_domain)
                
                # Get career options for this domain
                query = f"{predicted_domain} careers job roles"
                retrieved = self.rag_pipeline.retrieve(query, k=5)
                
                if domain_context or retrieved:
                    rag_context = "\n\nRelevant Career Information:\n"
                    if domain_context:
                        rag_context += f"Domain Overview:\n{domain_context[:800]}...\n\n"
                    
                    rag_context += "Available Careers in this Domain:\n"
                    for doc in retrieved:
                        if doc["type"] == "career":
                            rag_context += f"- {doc['name']}: {doc['content'][:400]}...\n"
            except Exception as e:
                logger.warning(f"Error retrieving RAG context: {e}")
        
        # Map domain to career options
        career_options = self._get_career_options_for_domain(predicted_domain)
        
        prompt = f"""You are a career counselor analyzing a user's complete profile and questionnaire answers to predict their most suitable specific career role.

User Profile:
{profile_text}

Stage 1 Answers:
{stage1_text}

Stage 2 Answers (Domain: {predicted_domain}):
{stage2_text}

{rag_context}

Based on all the information, predict the most suitable career from these options for the {predicted_domain} domain:
{', '.join(career_options)}

Respond in this exact format:
CAREER: <career_name>
CONFIDENCE: <confidence_score_0.0_to_0.9>
REASONING: <detailed_explanation_of_why_this_career_matches_the_user>

Important: Confidence should be realistic (typically 0.50-0.85, maximum 0.90). Consider how well the user's profile, interests, skills, and answers align with the career requirements."""
        
        # Retry logic for network errors
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = self._chat_with_key_fallback(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                )
                
                result_text = response.choices[0].message.content
                
                # Parse response
                career, confidence, reasoning = self._parse_prediction_response(result_text)
                
                # Validate career is in options
                if career.lower() not in [c.lower() for c in career_options]:
                    # Find closest match
                    career = self._find_closest_career(career, career_options)
                
                # Cap confidence at 0.90
                confidence = min(confidence, 0.90)
                
                logger.info(f"Predicted career: {career} (confidence: {confidence:.2f})")
                return career, confidence, reasoning
                
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {error_msg}")
                
                # Check if it's a network error
                if "getaddrinfo" in error_msg or "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        logger.error(f"Network error after {max_retries} attempts: {error_msg}")
                        fallback_career = career_options[0] if career_options else "general"
                        return fallback_career, 0.70, f"Network error: Using fallback prediction. Please check your internet connection."
                else:
                    # Non-network error, return fallback immediately
                    logger.error(f"Error in career prediction: {error_msg}")
                    fallback_career = career_options[0] if career_options else "general"
                    return fallback_career, 0.70, f"Error: {error_msg}. Using fallback prediction."
        
        # Final fallback
        fallback_career = career_options[0] if career_options else "general"
        return fallback_career, 0.70, "Unable to connect to Mistral API. Using fallback prediction."
    
    def _get_career_options_for_domain(self, domain: str) -> list:
        """Get list of career options for a domain"""
        domain_careers = {
            "computer_technology": [
                "software_engineer",
                "data_scientist",
                "cybersecurity_engineer",
                "devops_engineer",
                "ui_ux_designer",
            ],
            "medical": [
                "doctor",
                "nurse",
                "physiotherapist",
                "pharmacist",
            ],
            "business": [
                "accountant",
                "entrepreneur",
                "marketing_manager",
                "financial_analyst",
                "hr_manager",
            ],
            "engineering": [
                "mechanical_engineer",
                "civil_engineer",
                "electrical_engineer",
                "aerospace_engineer",
            ],
            "arts": [
                "graphic_designer",
                "musician",
                "actor",
                "photographer",
            ],
            "sports": [
                "athlete",
                "coach",
                "sports_physiotherapist",
                "fitness_trainer",
            ],
        }
        return domain_careers.get(domain.lower(), ["general"])
    
    def _find_closest_career(self, predicted: str, options: list) -> str:
        """Find closest matching career from options"""
        predicted_lower = predicted.lower().replace("_", " ").replace("-", " ")
        for option in options:
            option_lower = option.lower().replace("_", " ").replace("-", " ")
            if predicted_lower in option_lower or option_lower in predicted_lower:
                return option
        return options[0] if options else "general"
    
    def _format_profile(self, profile: Dict) -> str:
        """Format user profile for prompt"""
        parts = []
        if profile.get("name"):
            parts.append(f"Name: {profile['name']}")
        if profile.get("age"):
            parts.append(f"Age: {profile['age']}")
        if profile.get("education"):
            parts.append(f"Education: {profile['education']}")
        if profile.get("interests"):
            parts.append(f"Interests: {profile['interests']}")
        if profile.get("skills"):
            parts.append(f"Skills: {profile['skills']}")
        return "\n".join(parts) if parts else "No profile information provided"
    
    def _format_answers(self, answers: Dict) -> str:
        """Format answers for prompt"""
        if not answers:
            return "No answers provided"
        
        formatted = []
        for key, value in sorted(answers.items()):
            formatted.append(f"{key}: {value}")
        return "\n".join(formatted)
    
    def _fallback_domain_prediction(self, answers: Dict) -> str:
        """Fallback domain prediction based on answer patterns"""
        # Simple heuristic based on common answer patterns
        tech_keywords = ['a)', 'a)']
        medical_keywords = ['b)', 'b)']
        business_keywords = ['f)', 'f)']
        
        tech_count = sum(1 for a in answers.values() if a.startswith('a'))
        medical_count = sum(1 for a in answers.values() if a.startswith('b'))
        business_count = sum(1 for a in answers.values() if a.startswith('f'))
        
        if tech_count > medical_count and tech_count > business_count:
            return "computer_technology"
        elif medical_count > business_count:
            return "medical"
        else:
            return "business"
    
    def _fallback_domain_prediction(self, answers: Dict) -> str:
        """Fallback domain prediction based on answer patterns"""
        # Simple heuristic-based fallback
        answer_text = " ".join(answers.values()).lower()
        
        if any(word in answer_text for word in ["computer", "technology", "programming", "software"]):
            return "computer_technology"
        elif any(word in answer_text for word in ["medical", "health", "hospital", "patient"]):
            return "medical"
        elif any(word in answer_text for word in ["business", "finance", "marketing", "management"]):
            return "business"
        elif any(word in answer_text for word in ["engineering", "design", "build", "construction"]):
            return "engineering"
        elif any(word in answer_text for word in ["art", "creative", "design", "music"]):
            return "arts"
        elif any(word in answer_text for word in ["sport", "athletic", "fitness", "coach"]):
            return "sports"
        else:
            return "business"  # Default fallback
    
    def _parse_prediction_response(self, response: str) -> Tuple[str, float, str]:
        """Parse prediction response from LLM"""
        domain = "unknown"
        confidence = 0.75
        reasoning = response
        
        lines = response.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('DOMAIN:'):
                domain = line.replace('DOMAIN:', '').strip()
            elif line.startswith('CAREER:'):
                domain = line.replace('CAREER:', '').strip()
            elif line.startswith('CONFIDENCE:'):
                try:
                    conf_str = line.replace('CONFIDENCE:', '').strip()
                    confidence = float(conf_str)
                except:
                    confidence = 0.75
            elif line.startswith('REASONING:'):
                reasoning = line.replace('REASONING:', '').strip()
        
        # If reasoning wasn't found separately, use the full response
        if reasoning == response:
            # Try to extract reasoning from response
            if 'REASONING:' in response:
                reasoning = response.split('REASONING:')[1].strip()
            else:
                reasoning = response
        
        return domain, confidence, reasoning

