"""
Report Generator Module
Generates personalized career reports with multiple counselor styles
"""

import logging
import os
import time
import json
from typing import Dict, Optional, Any
from mistralai.client import MistralClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MistralReportGenerator:
    """Generates personalized career reports using Mistral LLM"""
    
    # Counselor style templates
    COUNSELOR_STYLES = {
        "friendly": {
            "name": "Friendly",
            "tone": "warm, encouraging, and conversational",
            "description": "Uses a warm, approachable tone with encouraging language"
        },
        "professional": {
            "name": "Professional",
            "tone": "formal, structured, and business-like",
            "description": "Uses a formal, structured approach with professional language"
        },
        "warm": {
            "name": "Warm",
            "tone": "empathetic, supportive, and nurturing",
            "description": "Uses an empathetic, supportive tone with nurturing language"
        },
        "reflective": {
            "name": "Reflective",
            "tone": "thoughtful, introspective, and insightful",
            "description": "Uses a thoughtful, introspective approach with deep insights"
        }
    }
    
    def __init__(self, 
                 api_key: Optional[str] = None,
                 model: str = "mistral-large-latest"):
        """
        Initialize report generator
        
        Args:
            api_key: Primary Mistral API key (or from MISTRAL_API_KEY env var)
            model: Mistral model name
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
        
        logger.info(
            f"Initialized report generator with model: {model} "
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
    
    def generate_report(self,
                       profile: Dict,
                       predicted_domain: str,
                       predicted_career: str,
                       domain_reasoning: str,
                       career_reasoning: str,
                       domain_confidence: float,
                       career_confidence: float,
                       counselor_style: str = "friendly") -> str:
        """
        Generate personalized career report
        
        Args:
            profile: User profile dictionary
            predicted_domain: Predicted career domain
            predicted_career: Predicted career role
            domain_reasoning: Reasoning for domain prediction
            career_reasoning: Reasoning for career prediction
            domain_confidence: Domain prediction confidence
            career_confidence: Career prediction confidence
            counselor_style: Counselor communication style
            
        Returns:
            Generated career report text
        """
        style_info = self.COUNSELOR_STYLES.get(counselor_style.lower(), self.COUNSELOR_STYLES["friendly"])
        
        profile_text = self._format_profile(profile)
        
        prompt = f"""You are an experienced career counselor with a {style_info['tone']} communication style. Write a natural, conversational career recommendation report.

User Information:
{profile_text}

Career Analysis:
- Domain: {predicted_domain.replace('_', ' ').title()}
- Career: {predicted_career.replace('_', ' ').title()}
- Domain Confidence: {domain_confidence:.0%}
- Career Confidence: {career_confidence:.0%}

Analysis Details:
{domain_reasoning}

{career_reasoning}

Write a natural, flowing career report (500-700 words) that:

1. Opens with a warm, personal greeting using the user's name
2. Naturally introduces the career recommendation without using section headers
3. Weaves in why this career fits their profile, interests, and skills organically
4. Shares 3-4 key insights from their responses in a conversational way
5. Concludes with practical next steps and encouragement

Guidelines:
- Write in a natural, flowing narrative style - avoid bullet points and formal section headers
- Use the user's name naturally throughout
- Make it feel like a personal conversation, not a formal document
- Use smooth transitions between ideas
- Keep the {style_info['tone']} tone consistent
- Be specific about their interests, skills, and how they align with the career
- End with genuine encouragement and actionable advice

Write the report as continuous, natural prose without markdown formatting or section headers."""
        
        # Retry logic for network errors
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = self._chat_with_key_fallback(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.8,
                )
                
                report = response.choices[0].message.content
                logger.info(f"Generated career report ({len(report)} characters)")
                return report
                
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {error_msg}")
                
                if "getaddrinfo" in error_msg or "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                    else:
                        logger.error(f"Network error after {max_retries} attempts")
                        return self._generate_fallback_report(profile, predicted_domain, predicted_career, counselor_style)
                else:
                    logger.error(f"Error generating report: {error_msg}")
                    return self._generate_fallback_report(profile, predicted_domain, predicted_career, counselor_style)
        
        return self._generate_fallback_report(profile, predicted_domain, predicted_career, counselor_style)
    
    def generate_learning_pathway(self, career: str, profile: Dict) -> Dict:
        """
        Generate learning pathway for predicted career
        
        Args:
            career: Career name
            profile: User profile dictionary
            
        Returns:
            Dictionary with learning pathway information
        """
        profile_text = self._format_profile(profile)
        
        prompt = f"""You are a career counselor and learning designer.
Generate a comprehensive learning pathway for someone pursuing a career as a "{career}".

User Profile:
{profile_text}

Return the result as STRICT JSON (no explanations, no markdown) with this exact structure:
{{
  "description": "High-level narrative overview of the pathway in markdown format",
  "phases": {{
    "foundation": "Short description of the foundation phase",
    "intermediate": "Short description of the intermediate phase",
    "advanced": "Short description of the advanced phase"
  }},
  "courses": [
    "Course 1 - Provider (Platform)",
    "Course 2 - Provider (Platform)"
  ],
  "certifications": [
    "Certification 1 - Provider",
    "Certification 2 - Provider"
  ],
  "skills": [
    "Key skill 1",
    "Key skill 2"
  ],
  "milestones": [
    "Milestone 1",
    "Milestone 2"
  ]
}}

Important:
- Respond with VALID JSON ONLY.
- Do NOT wrap the JSON in backticks.
- Do NOT include any additional commentary before or after the JSON."""
        
        # Retry logic for network errors
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = self._chat_with_key_fallback(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                )
                
                pathway_text = response.choices[0].message.content
                
                # Parse into structured format (prefer JSON from the model)
                try:
                    pathway_json: Any = json.loads(pathway_text)
                    if isinstance(pathway_json, dict):
                        pathway = self._parse_pathway(pathway_json, career, from_json=True)
                        logger.info(f"Generated learning pathway for {career} (from JSON)")
                        return pathway
                    else:
                        logger.warning("Learning pathway response was not a JSON object; falling back to text parser")
                except Exception as e:
                    logger.warning(f"Failed to parse learning pathway JSON: {e}. Falling back to text parser.")

                # Fallback: treat the whole response as descriptive text
                pathway = self._parse_pathway(pathway_text, career, from_json=False)
                logger.info(f"Generated learning pathway for {career} (from text fallback)")
                return pathway
                
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {error_msg}")
                
                if "getaddrinfo" in error_msg or "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                    else:
                        logger.error(f"Network error after {max_retries} attempts")
                        return self._generate_fallback_pathway(career)
                else:
                    logger.error(f"Error generating learning pathway: {error_msg}")
                    return self._generate_fallback_pathway(career)
        
        return self._generate_fallback_pathway(career)
    
    def _parse_pathway(self, pathway_source: Any, career: str, from_json: bool) -> Dict:
        """
        Parse pathway data into structured format.
        
        If from_json is True, pathway_source is expected to be a dict coming
        from the model's JSON response. Otherwise, it's a plain text string.
        """
        if from_json and isinstance(pathway_source, dict):
            data = pathway_source
            description = data.get("description") or ""
            phases = data.get("phases") or {}
            courses = data.get("courses") or []
            certifications = data.get("certifications") or []
            skills = data.get("skills") or []
            milestones = data.get("milestones") or []

            # Ensure basic defaults
            phases = {
                "foundation": phases.get("foundation") or "Essential skills and knowledge to start",
                "intermediate": phases.get("intermediate") or "Building expertise and practical skills",
                "advanced": phases.get("advanced") or "Specialization and mastery",
            }

            return {
                "career": career,
                "description": description,
                "phases": phases,
                "courses": courses,
                "certifications": certifications,
                "skills": skills,
                "milestones": milestones,
            }

        # Fallback: treat as plain text description, keep lists empty
        pathway_text = str(pathway_source)
        return {
            "career": career,
            "description": pathway_text,
            "phases": {
                "foundation": "Essential skills and knowledge to start",
                "intermediate": "Building expertise and practical skills",
                "advanced": "Specialization and mastery"
            },
            "courses": [],
            "certifications": [],
            "skills": [],
            "milestones": []
        }
    
    def _generate_fallback_report(self, profile: Dict, domain: str, career: str, style: str) -> str:
        """Generate a fallback report if LLM fails"""
        name = profile.get("name", "there")
        domain_name = domain.replace('_', ' ').title()
        career_name = career.replace('_', ' ').title()
        
        return f"""Hello {name},

I'm excited to share your career prediction results with you! After carefully analyzing your profile, interests, and questionnaire responses, I believe we've found a career path that aligns beautifully with who you are.

Your recommended career is {career_name} within the {domain_name} domain. This recommendation is based on how well your interests, skills, and responses match the characteristics and requirements of this field.

What makes this career particularly interesting for you is how it connects with your background. Your interests in {profile.get('interests', 'various fields')} and skills in {profile.get('skills', 'multiple areas')} create a strong foundation for success in {career_name}. The {domain_name} domain offers opportunities that resonate with what you've shared about your preferences and goals.

As you consider this path, I'd encourage you to take some practical next steps. Start by researching {career_name} in more detail - look into the day-to-day responsibilities, the work environment, and the growth opportunities. Connect with professionals already working in this field to get firsthand insights. Explore the educational pathways and certifications that could help you get started, and begin building the specific skills that will make you competitive.

Remember, career exploration is a journey, and this recommendation is a starting point. Take time to reflect on how this path feels to you, and don't hesitate to explore related careers within {domain_name} as well.

I'm confident that with your background and interests, you have what it takes to succeed in {career_name}. Trust your instincts, stay curious, and take those first steps toward building the career you want.

Best of luck on your journey ahead!"""
    
    def _generate_fallback_pathway(self, career: str) -> Dict:
        """Generate a fallback pathway if LLM fails"""
        return {
            "career": career,
            "description": f"Learning pathway for {career}",
            "phases": {
                "foundation": "Learn the basics and fundamentals",
                "intermediate": "Build practical skills and experience",
                "advanced": "Specialize and master advanced concepts"
            },
            "courses": ["Search for relevant courses on Coursera, Udemy, or edX"],
            "certifications": ["Research industry-recognized certifications"],
            "skills": ["Develop core skills for this career"],
            "milestones": ["Complete foundation phase", "Complete intermediate phase", "Complete advanced phase"]
        }
    
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
    
    @staticmethod
    def get_available_styles() -> list:
        """Get list of available counselor styles"""
        return list(MistralReportGenerator.COUNSELOR_STYLES.keys())
    
    @staticmethod
    def get_style_info(style: str) -> Dict:
        """Get information about a counselor style"""
        return MistralReportGenerator.COUNSELOR_STYLES.get(style.lower(), MistralReportGenerator.COUNSELOR_STYLES["friendly"])

