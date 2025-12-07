from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict
from pydantic import BaseModel
import os
import json
from datetime import datetime, timedelta
from collections import defaultdict
import google.generativeai as genai
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()

router = APIRouter(prefix="/api/interview", tags=["interview"])

# Initialize Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ [INTERVIEW MODULE] Gemini API key loaded successfully")
else:
    print("⚠️  [INTERVIEW MODULE] WARNING: GEMINI_API_KEY not found in environment variables")
    print("   Interview features will use fallback evaluation mode")

# Initialize MongoDB
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "careerinsights")

try:
    mongo_client = MongoClient(MONGODB_URI)
    mongo_db = mongo_client[MONGODB_DB_NAME]
    # Collections
    sessions_collection = mongo_db["interview_sessions"]
    progress_collection = mongo_db["interview_progress"]
    difficulty_collection = mongo_db["interview_difficulty"]
    
    # Create indexes for better performance
    sessions_collection.create_index("session_id", unique=True)
    sessions_collection.create_index("created_at")
    progress_collection.create_index("job_title")
    progress_collection.create_index("timestamp")
    difficulty_collection.create_index("job_title", unique=True)
    
    print("✅ [INTERVIEW MODULE] MongoDB connected successfully")
except Exception as e:
    print(f"⚠️  [INTERVIEW MODULE] WARNING: MongoDB connection failed: {str(e)}")
    print("   Using in-memory storage as fallback")
    mongo_client = None
    mongo_db = None
    sessions_collection = None
    progress_collection = None
    difficulty_collection = None

# Fallback in-memory storage (if MongoDB is not available)
user_sessions = {}
user_progress = defaultdict(list)
user_difficulty = defaultdict(lambda: "medium")

# Cache for Gemini model instance
_cached_gemini_model = None
_gemini_model_initialized = False


# Pydantic models
class QuestionRequest(BaseModel):
    job_title: str
    question_type: str  # "technical", "behavioral", "career-specific"
    difficulty: Optional[str] = "medium"  # "easy", "medium", "hard"
    experience_level: Optional[str] = "mid-level"


class AnswerSubmission(BaseModel):
    session_id: str
    question_id: str
    answer: str
    time_taken: Optional[int] = None  # seconds


class SessionRequest(BaseModel):
    job_title: str
    question_type: str
    num_questions: Optional[int] = 5
    time_per_question: Optional[int] = 300  # seconds (5 minutes default)


def get_gemini_model():
    """Get Gemini model instance (cached)."""
    global _cached_gemini_model, _gemini_model_initialized
    
    # Return cached model if available
    if _cached_gemini_model is not None:
        return _cached_gemini_model
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY not configured. Please set it in your environment variables."
        )
    
    # Only try to initialize once per session
    if _gemini_model_initialized:
        raise Exception("Gemini model initialization failed previously")
    
    _gemini_model_initialized = True
    
    try:
        # Try to list available models first to see what's available
        try:
            available_models = genai.list_models()
            model_names = []
            for m in available_models:
                if hasattr(m, 'supported_generation_methods') and 'generateContent' in m.supported_generation_methods:
                    model_name = m.name if hasattr(m, 'name') else str(m)
                    model_names.append(model_name)
            
            if model_names:
                print(f"✅ Found {len(model_names)} available Gemini model(s)")
            
            # Try common model names in order of preference - actually test each one
            preferred_models = [
                'models/gemini-1.5-flash-latest',
                'models/gemini-1.5-pro-latest',
                'models/gemini-1.5-flash',
                'models/gemini-1.5-pro',
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro-latest',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
            ]
            
            # Test each preferred model to see if it actually works
            for model_name in preferred_models:
                model_short = model_name.split('/')[-1]
                # Check if any available model matches
                for available in model_names:
                    if model_short in available or available.endswith(model_short):
                        try:
                            # Try to actually create and test the model
                            test_model = genai.GenerativeModel(model_name)
                            # Cache it if successful
                            _cached_gemini_model = test_model
                            print(f"✅ Using Gemini model: {model_name}")
                            return _cached_gemini_model
                        except Exception:
                            # Try with the full available model name
                            try:
                                test_model = genai.GenerativeModel(available)
                                _cached_gemini_model = test_model
                                print(f"✅ Using Gemini model: {available}")
                                return _cached_gemini_model
                            except Exception:
                                continue
            
            # If no preferred model works, try each available model until one works
            for model_name in model_names:
                try:
                    test_model = genai.GenerativeModel(model_name)
                    _cached_gemini_model = test_model
                    print(f"✅ Using working model: {model_name}")
                    return _cached_gemini_model
                except Exception:
                    continue
                    
        except Exception as list_error:
            print(f"⚠️  Could not list models: {str(list_error)}")
        
        # If everything fails, don't cache and let it fail (will trigger fallback)
        raise Exception("No compatible Gemini model found")
        
    except Exception as e:
        print(f"⚠️  Gemini model initialization failed: {str(e)}")
        # Don't raise HTTPException - let calling functions handle fallback
        raise


def generate_question(job_title: str, question_type: str, difficulty: str, experience_level: str) -> Dict:
    """Generate AI-powered interview question using Gemini API."""
    try:
        model = get_gemini_model()
    except Exception:
        # If model initialization fails, return fallback question
        return get_fallback_question(job_title, question_type, difficulty, experience_level)
    
    prompt = f"""Generate a {difficulty} level {question_type} interview question for a {experience_level} {job_title} position.

Requirements:
- The question should be specific to the {job_title} role
- Difficulty level: {difficulty}
- Question type: {question_type}
- Make it realistic and relevant to industry standards
- Include what the interviewer is looking for in the answer

Format your response as JSON with the following structure:
{{
    "question": "The interview question",
    "question_type": "{question_type}",
    "difficulty": "{difficulty}",
    "expected_topics": ["topic1", "topic2", "topic3"],
    "evaluation_criteria": ["criterion1", "criterion2", "criterion3"],
    "tips": "Brief tip for answering this question (maximum 2-3 lines, keep it concise)"
}}

IMPORTANT: The "tips" field must be very brief - maximum 2-3 lines. Keep it concise and actionable.

Only return the JSON, no additional text."""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip() if hasattr(response, 'text') and response.text else ""
        
        if not response_text:
            # Model returned empty response, use fallback
            return get_fallback_question(job_title, question_type, difficulty, experience_level)
        
        # Clean up response (remove markdown code blocks if present)
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        question_data = json.loads(response_text)
        
        # Ensure tips are limited to 2-3 lines
        if "tips" in question_data and question_data["tips"]:
            tips_lines = question_data["tips"].split('\n')
            # Keep only first 3 lines and join them
            question_data["tips"] = '\n'.join(tips_lines[:3]).strip()
        
        # Add metadata
        question_data["question_id"] = f"q_{datetime.now().timestamp()}"
        question_data["job_title"] = job_title
        question_data["experience_level"] = experience_level
        question_data["created_at"] = datetime.now().isoformat()
        
        return question_data
    except json.JSONDecodeError as e:
        # Fallback if JSON parsing fails
        print(f"⚠️  JSON decode error in generate_question, using fallback")
        return get_fallback_question(job_title, question_type, difficulty, experience_level)
    except Exception as e:
        # Check if it's a model not found error - suppress verbose logging
        error_str = str(e).lower()
        if "not found" in error_str or "not supported" in error_str:
            print(f"⚠️  Gemini model not available for question generation, using fallback")
        else:
            print(f"⚠️  Error in generate_question, using fallback: {str(e)}")
        # Return fallback question instead of raising exception
        return get_fallback_question(job_title, question_type, difficulty, experience_level)


def get_fallback_question(job_title: str, question_type: str, difficulty: str, experience_level: str) -> Dict:
    """Generate a fallback question when AI is unavailable."""
    import random
    
    # Generate context-appropriate questions based on type
    if question_type == "technical":
        questions = [
            f"Describe your approach to solving technical challenges in a {job_title} role.",
            f"What technical skills are most important for a {job_title} position?",
            f"Explain a complex technical problem you've solved in your career.",
            f"How do you stay updated with the latest technologies in {job_title}?",
            f"Describe your experience with the technical stack commonly used in {job_title} roles."
        ]
    elif question_type == "behavioral":
        questions = [
            f"Tell me about a time you faced a challenging situation in your {job_title} career.",
            f"Describe a project where you had to work with a difficult team member.",
            f"How do you handle tight deadlines and pressure in a {job_title} role?",
            f"Give an example of how you've demonstrated leadership in your career.",
            f"Describe a situation where you had to learn a new skill quickly for a {job_title} project."
        ]
    else:  # career-specific
        questions = [
            f"What interests you most about a career in {job_title}?",
            f"Where do you see yourself in 5 years as a {job_title}?",
            f"What unique value would you bring to a {job_title} role?",
            f"Describe your career goals and how this {job_title} position fits into them.",
            f"What motivates you to pursue a career in {job_title}?"
        ]
    
    question = random.choice(questions)
    
    return {
        "question": question,
        "question_type": question_type,
        "difficulty": difficulty,
        "expected_topics": ["Experience", "Skills", "Problem-solving"] if question_type == "technical" else ["Behavior", "Situation", "Outcome"] if question_type == "behavioral" else ["Career goals", "Motivation", "Fit"],
        "evaluation_criteria": ["Relevance", "Clarity", "Depth", "Examples"],
        "tips": "Use the STAR method: Situation, Task, Action, Result. Provide specific examples.",
        "question_id": f"q_{datetime.now().timestamp()}",
        "job_title": job_title,
        "experience_level": experience_level,
        "created_at": datetime.now().isoformat()
    }


def evaluate_answer(question: Dict, answer: str, time_taken: Optional[int] = None) -> Dict:
    """Evaluate user's answer using AI and provide feedback."""
    try:
        model = get_gemini_model()
    except HTTPException:
        # If Gemini API is not available, return fallback evaluation
        return get_fallback_evaluation(question, answer, time_taken)
    
    prompt = f"""Evaluate the following interview answer:

Question: {question.get('question', '')}
Question Type: {question.get('question_type', '')}
Difficulty: {question.get('difficulty', 'medium')}
Expected Topics: {', '.join(question.get('expected_topics', []))}
Evaluation Criteria: {', '.join(question.get('evaluation_criteria', []))}

Candidate's Answer:
{answer}

Time Taken: {time_taken} seconds (if provided)

Please evaluate this answer and provide:
1. A score from 0-100
2. Strengths (what the candidate did well)
3. Areas for improvement
4. Specific feedback
5. An AI-enhanced version of the answer (improved version)

Format your response as JSON:
{{
    "score": 85,
    "score_breakdown": {{
        "relevance": 90,
        "clarity": 85,
        "depth": 80,
        "examples": 75
    }},
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"],
    "feedback": "Detailed feedback text",
    "enhanced_answer": "An improved version of the answer with better structure and examples"
}}

Only return the JSON, no additional text."""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip() if hasattr(response, 'text') and response.text else ""
        
        if not response_text:
            return get_fallback_evaluation(question, answer, time_taken)
        
        # Clean up response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        evaluation = json.loads(response_text)
        
        # Add metadata
        evaluation["original_answer"] = answer
        evaluation["question_id"] = question.get("question_id")
        evaluation["evaluated_at"] = datetime.now().isoformat()
        evaluation["time_taken"] = time_taken
        
        return evaluation
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON decode error in evaluate_answer, using fallback evaluation")
        return get_fallback_evaluation(question, answer, time_taken)
    except Exception as e:
        # Check if it's a model not found error - suppress verbose logging for expected errors
        error_str = str(e).lower()
        if "not found" in error_str or "not supported" in error_str:
            print(f"⚠️  Gemini model not available, using fallback evaluation mode")
        else:
            print(f"⚠️  Error in evaluate_answer, using fallback: {str(e)}")
        return get_fallback_evaluation(question, answer, time_taken)


def get_fallback_evaluation(question: Dict, answer: str, time_taken: Optional[int] = None) -> Dict:
    """Generate a fallback evaluation when AI is unavailable."""
    # Simple scoring based on answer length and content
    answer_length = len(answer.split())
    length_score = min(100, max(40, answer_length * 2))
    
    # Check for common good indicators
    has_examples = any(word in answer.lower() for word in ['example', 'instance', 'experience', 'project'])
    has_numbers = any(char.isdigit() for char in answer)
    has_action_verbs = any(word in answer.lower() for word in ['achieved', 'developed', 'implemented', 'created', 'led'])
    
    score = length_score
    if has_examples:
        score += 10
    if has_numbers:
        score += 5
    if has_action_verbs:
        score += 5
    score = min(100, score)
    
    strengths = []
    improvements = []
    
    if answer_length > 50:
        strengths.append("Comprehensive answer with good detail")
    else:
        improvements.append("Consider providing more detail and examples")
    
    if has_examples:
        strengths.append("Includes specific examples")
    else:
        improvements.append("Add specific examples from your experience")
    
    if has_action_verbs:
        strengths.append("Uses action-oriented language")
    else:
        improvements.append("Use more action verbs to describe achievements")
    
    if not strengths:
        strengths.append("Answer provided")
    
    if not improvements:
        improvements.append("Consider structuring your answer more clearly")
    
    return {
        "score": score,
        "score_breakdown": {
            "relevance": score,
            "clarity": score - 5,
            "depth": score - 10,
            "examples": score - 15 if not has_examples else score
        },
        "strengths": strengths,
        "improvements": improvements,
        "feedback": "Your answer has been evaluated. " + ("Consider adding more specific examples and structuring it better." if not has_examples else "Good structure and examples."),
        "enhanced_answer": generate_enhanced_answer(question, answer, has_examples, has_action_verbs, answer_length),
        "original_answer": answer,
        "question_id": question.get("question_id"),
        "evaluated_at": datetime.now().isoformat(),
        "time_taken": time_taken
    }


def generate_enhanced_answer(question: Dict, original_answer: str, has_examples: bool, has_action_verbs: bool, answer_length: int) -> str:
    """Generate an enhanced version of the answer with better structure and examples."""
    question_type = question.get('question_type', 'technical')
    job_title = question.get('job_title', 'professional')
    
    # If answer is very short, expand it significantly
    if answer_length < 20:
        if question_type == 'technical':
            enhanced = f"In my experience as a {job_title}, I approach technical challenges systematically. "
            enhanced += f"First, I analyze the problem thoroughly to understand the requirements. "
            enhanced += f"Then, I break it down into manageable components. "
            enhanced += f"For example, when working with data, I typically start by cleaning and preprocessing it, "
            enhanced += f"ensuring data quality before applying any analysis or machine learning models. "
            enhanced += f"I also document my approach and results for future reference and team collaboration."
        elif question_type == 'behavioral':
            enhanced = f"In a previous situation, I encountered a challenging scenario that required careful handling. "
            enhanced += f"I took the following approach: First, I assessed the situation to understand all perspectives. "
            enhanced += f"Then, I communicated with relevant stakeholders to gather information. "
            enhanced += f"I developed a plan and executed it step by step, adapting as needed. "
            enhanced += f"The outcome was positive, and I learned valuable lessons about collaboration and problem-solving."
        else:
            enhanced = f"Based on my experience in {job_title}, I would approach this by: "
            enhanced += f"1) Understanding the context and requirements, "
            enhanced += f"2) Developing a strategic plan, "
            enhanced += f"3) Executing with attention to detail, and "
            enhanced += f"4) Evaluating results and iterating for improvement."
        
        # Incorporate original answer if it has useful content
        if original_answer.strip():
            enhanced += f" Specifically, {original_answer.strip()}."
    else:
        # For longer answers, enhance structure and add missing elements
        enhanced = original_answer
        
        # Add structure if missing
        if not any(marker in original_answer.lower() for marker in ['first', 'then', 'next', 'finally', '1.', '2.', '3.']):
            sentences = original_answer.split('.')
            if len(sentences) > 1:
                enhanced = ""
                for i, sentence in enumerate(sentences[:3], 1):
                    if sentence.strip():
                        enhanced += f"{i}. {sentence.strip()}. "
                if len(sentences) > 3:
                    enhanced += " ".join(sentences[3:])
        
        # Add example if missing
        if not has_examples and answer_length > 10:
            enhanced += " For example, in a recent project, I applied this approach and achieved positive results."
        
        # Add action verbs if missing
        if not has_action_verbs and answer_length > 10:
            # Try to enhance with action verbs
            enhanced = enhanced.replace("I work", "I have worked")
            enhanced = enhanced.replace("I do", "I have done")
            enhanced = enhanced.replace("I use", "I have utilized")
    
    return enhanced.strip() if enhanced.strip() else original_answer


def adjust_difficulty(current_difficulty: str, average_score: float) -> str:
    """Adjust difficulty based on user performance."""
    if average_score >= 85:
        if current_difficulty == "easy":
            return "medium"
        elif current_difficulty == "medium":
            return "hard"
        else:
            return "hard"  # Stay at hard
    elif average_score < 60:
        if current_difficulty == "hard":
            return "medium"
        elif current_difficulty == "medium":
            return "easy"
        else:
            return "easy"  # Stay at easy
    else:
        return current_difficulty  # Keep current difficulty


# MongoDB helper functions
def save_session(session: Dict):
    """Save session to MongoDB or in-memory."""
    if sessions_collection is not None:
        try:
            # Convert datetime objects to strings for MongoDB
            session_copy = json.loads(json.dumps(session, default=str))
            # Ensure answers is a dict, not None
            if "answers" not in session_copy:
                session_copy["answers"] = {}
            sessions_collection.update_one(
                {"session_id": session["session_id"]},
                {"$set": session_copy},
                upsert=True
            )
        except Exception as e:
            print(f"⚠️  Error saving session to MongoDB: {str(e)}")
            user_sessions[session["session_id"]] = session
    else:
        user_sessions[session["session_id"]] = session


def get_session(session_id: str) -> Optional[Dict]:
    """Get session from MongoDB or in-memory."""
    if sessions_collection is not None:
        try:
            session = sessions_collection.find_one({"session_id": session_id})
            if session:
                # Remove MongoDB _id field and convert to JSON-serializable
                session.pop("_id", None)
                # Ensure answers exists
                if "answers" not in session:
                    session["answers"] = {}
                # Convert any remaining ObjectId or datetime objects
                session = json.loads(json.dumps(session, default=str))
                return session
            return None
        except Exception as e:
            print(f"⚠️  Error getting session from MongoDB: {str(e)}")
            return user_sessions.get(session_id)
    else:
        return user_sessions.get(session_id)


def save_progress(progress_entry: Dict):
    """Save progress entry to MongoDB or in-memory."""
    if progress_collection is not None:
        try:
            progress_copy = json.loads(json.dumps(progress_entry, default=str))
            progress_collection.insert_one(progress_copy)
        except Exception as e:
            print(f"⚠️  Error saving progress to MongoDB: {str(e)}")
            user_progress[progress_entry["job_title"]].append(progress_entry)
    else:
        user_progress[progress_entry["job_title"]].append(progress_entry)


def get_progress_data(job_title: str) -> List[Dict]:
    """Get all progress entries for a job title from MongoDB or in-memory."""
    if progress_collection is not None:
        try:
            progress_list = list(progress_collection.find({"job_title": job_title}).sort("timestamp", -1))
            # Remove MongoDB _id fields
            for entry in progress_list:
                entry.pop("_id", None)
            return progress_list
        except Exception as e:
            print(f"⚠️  Error getting progress from MongoDB: {str(e)}")
            return user_progress.get(job_title, [])
    else:
        return user_progress.get(job_title, [])


def save_difficulty(job_title: str, difficulty: str):
    """Save difficulty level to MongoDB or in-memory."""
    if difficulty_collection is not None:
        try:
            difficulty_collection.update_one(
                {"job_title": job_title},
                {"$set": {"difficulty": difficulty, "updated_at": datetime.now().isoformat()}},
                upsert=True
            )
        except Exception as e:
            print(f"⚠️  Error saving difficulty to MongoDB: {str(e)}")
            user_difficulty[job_title] = difficulty
    else:
        user_difficulty[job_title] = difficulty


def get_difficulty(job_title: str) -> str:
    """Get difficulty level from MongoDB or in-memory."""
    if difficulty_collection is not None:
        try:
            doc = difficulty_collection.find_one({"job_title": job_title})
            if doc:
                return doc.get("difficulty", "medium")
            return "medium"
        except Exception as e:
            print(f"⚠️  Error getting difficulty from MongoDB: {str(e)}")
            return user_difficulty.get(job_title, "medium")
    else:
        return user_difficulty.get(job_title, "medium")


@router.post("/generate-question")
def generate_interview_question(request: QuestionRequest):
    """FE1: Generate AI-powered interview questions."""
    try:
        question = generate_question(
            job_title=request.job_title,
            question_type=request.question_type,
            difficulty=request.difficulty,
            experience_level=request.experience_level
        )
        return question
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating question: {str(e)}"
        )


@router.post("/create-session")
def create_practice_session(request: SessionRequest):
    """Create a new interview practice session."""
    try:
        session_id = f"session_{datetime.now().timestamp()}"
        
        # Generate questions for the session
        questions = []
        current_difficulty = get_difficulty(request.job_title)
        
        for i in range(request.num_questions):
            try:
                question = generate_question(
                    job_title=request.job_title,
                    question_type=request.question_type,
                    difficulty=current_difficulty,
                    experience_level="mid-level"
                )
                questions.append(question)
            except Exception as e:
                print(f"Error generating question {i+1}: {str(e)}")
                # If question generation fails, create a fallback question
                questions.append({
                    "question": f"Tell me about your experience with {request.job_title}.",
                    "question_type": request.question_type,
                    "difficulty": current_difficulty,
                    "expected_topics": ["Experience", "Skills", "Achievements"],
                    "evaluation_criteria": ["Relevance", "Clarity", "Depth"],
                    "tips": "Use specific examples. Structure your answer clearly.",
                    "question_id": f"q_{datetime.now().timestamp()}_{i}",
                    "job_title": request.job_title,
                    "experience_level": "mid-level",
                    "created_at": datetime.now().isoformat()
                })
        
        session = {
            "session_id": session_id,
            "job_title": request.job_title,
            "question_type": request.question_type,
            "questions": questions,
            "time_per_question": request.time_per_question,
            "created_at": datetime.now().isoformat(),
            "answers": {},
            "current_question": 0,
            "completed": False
        }
        
        # Save session to MongoDB
        save_session(session)
        
        return {
            "session_id": session_id,
            "session": session
        }
    except Exception as e:
        import traceback
        print(f"Error in create_practice_session: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error creating session: {str(e)}"
        )


@router.get("/session/{session_id}")
def get_session_endpoint(session_id: str):
    """Get session details."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions")
def get_all_sessions(job_title: Optional[str] = None, limit: int = 50):
    """Get all sessions for analytics. Optionally filter by job_title."""
    try:
        if sessions_collection is not None:
            query = {}
            if job_title:
                query["job_title"] = job_title
            
            sessions_cursor = sessions_collection.find(query).sort("created_at", -1).limit(limit)
            sessions = []
            for session in sessions_cursor:
                # Remove MongoDB _id field
                session.pop("_id", None)
                # Ensure answers exists
                if "answers" not in session:
                    session["answers"] = {}
                # Convert to JSON-serializable format
                session_dict = json.loads(json.dumps(session, default=str))
                sessions.append(session_dict)
            
            return {
                "sessions": sessions,
                "total": len(sessions)
            }
        else:
            # Fallback to in-memory
            all_sessions = list(user_sessions.values())
            if job_title:
                all_sessions = [s for s in all_sessions if s.get("job_title") == job_title]
            all_sessions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return {
                "sessions": all_sessions[:limit],
                "total": len(all_sessions)
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving sessions: {str(e)}"
        )


@router.post("/submit-answer")
def submit_answer(submission: AnswerSubmission):
    """FE3: Submit answer and get AI-based evaluation."""
    try:
        session = get_session(submission.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Find the question
        question = None
        for q in session["questions"]:
            if q["question_id"] == submission.question_id:
                question = q
                break
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found in session")
        
        # Evaluate the answer
        evaluation = evaluate_answer(question, submission.answer, submission.time_taken)
        
        # Store answer and evaluation
        if "answers" not in session:
            session["answers"] = {}
        session["answers"][submission.question_id] = {
            "answer": submission.answer,
            "evaluation": evaluation,
            "submitted_at": datetime.now().isoformat()
        }
        
        # Save updated session to MongoDB
        save_session(session)
        
        # Update progress
        progress_entry = {
            "session_id": submission.session_id,
            "question_id": submission.question_id,
            "job_title": session["job_title"],
            "question_type": session["question_type"],
            "score": evaluation.get("score", 70),
            "difficulty": question.get("difficulty", "medium"),
            "timestamp": datetime.now().isoformat()
        }
        save_progress(progress_entry)
        
        # FE2: Adjust difficulty based on performance
        progress_data = get_progress_data(session["job_title"])
        recent_scores = [p["score"] for p in progress_data[-5:]]
        if recent_scores:
            avg_score = sum(recent_scores) / len(recent_scores)
            new_difficulty = adjust_difficulty(question.get("difficulty", "medium"), avg_score)
            save_difficulty(session["job_title"], new_difficulty)
            evaluation["next_difficulty"] = new_difficulty
        
        # FE9: Include enhanced answer for comparison
        evaluation["comparison"] = {
            "original": submission.answer,
            "enhanced": evaluation.get("enhanced_answer", submission.answer),
            "improvements": evaluation.get("improvements", [])
        }
        
        return {
            "evaluation": evaluation,
            "session_progress": {
                "answered": len(session["answers"]),
                "total": len(session["questions"])
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in submit_answer: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error submitting answer: {str(e)}"
        )


@router.get("/progress/{job_title}")
def get_progress(job_title: str):
    """FE6: Get user progress and analytics from all past sessions."""
    # Load all progress data from MongoDB
    progress_data = get_progress_data(job_title)
    
    # Load all past sessions for this job title
    past_sessions = []
    if sessions_collection is not None:
        try:
            sessions_cursor = sessions_collection.find({"job_title": job_title}).sort("created_at", -1)
            for session in sessions_cursor:
                session.pop("_id", None)
                # Convert to JSON-serializable format
                session_dict = json.loads(json.dumps(session, default=str))
                past_sessions.append(session_dict)
        except Exception as e:
            print(f"⚠️  Error loading past sessions: {str(e)}")
    else:
        # Fallback to in-memory
        past_sessions = [s for s in user_sessions.values() if s.get("job_title") == job_title]
        past_sessions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    if not progress_data and not past_sessions:
        return {
            "job_title": job_title,
            "total_sessions": 0,
            "total_questions": 0,
            "average_score": 0,
            "scores_by_type": {},
            "scores_by_difficulty": {},
            "current_difficulty": "medium",
            "trends": [],
            "recent_scores": [],
            "session_history": [],
            "sessions_summary": []
        }
    
    # Calculate statistics from progress data
    total_questions = len(progress_data)
    scores = [p["score"] for p in progress_data] if progress_data else []
    average_score = sum(scores) / len(scores) if scores else 0
    
    # Group by question type
    scores_by_type = defaultdict(list)
    for p in progress_data:
        scores_by_type[p["question_type"]].append(p["score"])
    
    type_averages = {k: sum(v) / len(v) for k, v in scores_by_type.items()}
    
    # Group by difficulty
    scores_by_difficulty = defaultdict(list)
    for p in progress_data:
        scores_by_difficulty[p["difficulty"]].append(p["score"])
    
    difficulty_averages = {k: sum(v) / len(v) for k, v in scores_by_difficulty.items()}
    
    # Calculate trends (last 10 questions)
    recent_scores = scores[-10:] if scores else []
    trends = []
    for i in range(len(recent_scores)):
        if i > 0:
            trend = "improving" if recent_scores[i] > recent_scores[i-1] else "declining" if recent_scores[i] < recent_scores[i-1] else "stable"
            trends.append({
                "index": i,
                "score": recent_scores[i],
                "trend": trend
            })
    
    # Process session history - calculate session-level statistics
    session_history = []
    sessions_summary = []
    
    for session in past_sessions:
        session_id = session.get("session_id")
        session_answers = session.get("answers", {})
        session_questions = session.get("questions", [])
        
        # Calculate session statistics
        session_scores = []
        for q_id, answer_data in session_answers.items():
            evaluation = answer_data.get("evaluation", {})
            score = evaluation.get("score", 0)
            session_scores.append(score)
        
        session_avg_score = sum(session_scores) / len(session_scores) if session_scores else 0
        questions_answered = len(session_answers)
        total_questions_in_session = len(session_questions)
        completion_rate = (questions_answered / total_questions_in_session * 100) if total_questions_in_session > 0 else 0
        
        session_info = {
            "session_id": session_id,
            "created_at": session.get("created_at", ""),
            "question_type": session.get("question_type", ""),
            "total_questions": total_questions_in_session,
            "questions_answered": questions_answered,
            "completion_rate": round(completion_rate, 1),
            "average_score": round(session_avg_score, 2),
            "completed": session.get("completed", False)
        }
        
        session_history.append(session_info)
        sessions_summary.append({
            "date": session.get("created_at", ""),
            "score": round(session_avg_score, 2),
            "questions": questions_answered,
            "type": session.get("question_type", "")
        })
    
    # Sort session history by date (newest first)
    session_history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    sessions_summary.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {
        "job_title": job_title,
        "total_sessions": len(past_sessions),
        "total_questions": total_questions,
        "average_score": round(average_score, 2),
        "scores_by_type": {k: round(v, 2) for k, v in type_averages.items()},
        "scores_by_difficulty": {k: round(sum(v) / len(v), 2) for k, v in scores_by_difficulty.items()},
        "current_difficulty": get_difficulty(job_title),
        "trends": trends,
        "recent_scores": recent_scores,
        "session_history": session_history[:20],  # Last 20 sessions
        "sessions_summary": sessions_summary[:20]  # Last 20 sessions for charts
    }


@router.get("/generate-report/{session_id}")
def generate_performance_report(session_id: str):
    """FE7: Generate detailed PDF performance report."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e9ff5'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#ff8a00'),
        spaceAfter=12
    )
    
    # Title
    story.append(Paragraph("Interview Performance Report", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Session Info
    story.append(Paragraph(f"<b>Job Title:</b> {session['job_title']}", styles['Normal']))
    story.append(Paragraph(f"<b>Question Type:</b> {session['question_type']}", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {session['created_at']}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Summary Statistics
    story.append(Paragraph("Summary Statistics", heading_style))
    answers = session.get("answers", {})
    if answers:
        scores = [a["evaluation"]["score"] for a in answers.values()]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        story.append(Paragraph(f"<b>Total Questions:</b> {len(session['questions'])}", styles['Normal']))
        story.append(Paragraph(f"<b>Questions Answered:</b> {len(answers)}", styles['Normal']))
        story.append(Paragraph(f"<b>Average Score:</b> {avg_score:.1f}/100", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Detailed Results
    story.append(Paragraph("Detailed Results", heading_style))
    
    for i, question in enumerate(session["questions"], 1):
        story.append(Paragraph(f"<b>Question {i}:</b>", styles['Normal']))
        story.append(Paragraph(question["question"], styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
        
        if question["question_id"] in answers:
            answer_data = answers[question["question_id"]]
            eval_data = answer_data["evaluation"]
            
            story.append(Paragraph(f"<b>Your Answer:</b>", styles['Normal']))
            story.append(Paragraph(answer_data["answer"][:500] + "...", styles['Normal']))
            story.append(Spacer(1, 0.1*inch))
            
            story.append(Paragraph(f"<b>Score:</b> {eval_data['score']}/100", styles['Normal']))
            
            if "strengths" in eval_data:
                story.append(Paragraph("<b>Strengths:</b>", styles['Normal']))
                for strength in eval_data["strengths"]:
                    story.append(Paragraph(f"• {strength}", styles['Normal']))
            
            if "improvements" in eval_data:
                story.append(Paragraph("<b>Areas for Improvement:</b>", styles['Normal']))
                for improvement in eval_data["improvements"]:
                    story.append(Paragraph(f"• {improvement}", styles['Normal']))
            
            if "feedback" in eval_data:
                story.append(Paragraph(f"<b>Feedback:</b> {eval_data['feedback']}", styles['Normal']))
        else:
            story.append(Paragraph("<i>Not answered</i>", styles['Normal']))
        
        story.append(Spacer(1, 0.2*inch))
    
    # Recommendations
    story.append(PageBreak())
    story.append(Paragraph("Recommendations & Tips", heading_style))
    
    # FE8: Career-specific tips
    tips_prompt = f"Provide 5 specific interview preparation tips for a {session['job_title']} position focusing on {session['question_type']} questions."
    try:
        model = get_gemini_model()
        tips_response = model.generate_content(tips_prompt)
        tips_text = tips_response.text
        story.append(Paragraph(tips_text, styles['Normal']))
    except:
        story.append(Paragraph("• Practice regularly with different question types", styles['Normal']))
        story.append(Paragraph("• Review your answers and identify patterns", styles['Normal']))
        story.append(Paragraph("• Focus on areas with lower scores", styles['Normal']))
        story.append(Paragraph("• Use the STAR method for behavioral questions", styles['Normal']))
        story.append(Paragraph("• Prepare specific examples from your experience", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    # Encode PDF as base64 for JSON response
    import base64
    pdf_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return {
        "pdf_data": pdf_base64,
        "filename": f"interview_report_{session_id}.pdf"
    }


@router.get("/tips/{job_title}")
def get_interview_tips(job_title: str, question_type: Optional[str] = None):
    """FE8: Get career-specific interview preparation tips."""
    model = get_gemini_model()
    
    prompt = f"Provide 10 specific interview preparation tips for a {job_title} position"
    if question_type:
        prompt += f" focusing on {question_type} questions"
    prompt += ". Format as a numbered list with brief explanations."
    
    try:
        response = model.generate_content(prompt)
        tips = response.text
        
        return {
            "job_title": job_title,
            "question_type": question_type,
            "tips": tips.split('\n') if '\n' in tips else [tips]
        }
    except Exception as e:
        # Fallback tips
        return {
            "job_title": job_title,
            "question_type": question_type,
            "tips": [
                "Research the company and role thoroughly",
                "Prepare specific examples using the STAR method",
                "Practice common technical questions for your field",
                "Review your resume and be ready to discuss any point",
                "Prepare thoughtful questions to ask the interviewer"
            ]
        }


@router.get("/assistant-guidance")
def get_assistant_guidance(job_title: str, question_type: str, current_question: Optional[str] = None):
    """FE4: Get real-time guidance and role-specific tips."""
    model = get_gemini_model()
    
    prompt = f"""You are an interview preparation assistant helping a candidate prepare for a {job_title} position.

Question Type: {question_type}
"""
    if current_question:
        prompt += f"Current Question: {current_question}\n"
    
    prompt += """Provide:
1. Brief guidance on how to approach this type of question
2. Key points to cover in the answer
3. Common mistakes to avoid
4. A quick tip for success

Keep it concise and actionable."""

    try:
        response = model.generate_content(prompt)
        guidance = response.text
        
        return {
            "job_title": job_title,
            "question_type": question_type,
            "guidance": guidance,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "job_title": job_title,
            "question_type": question_type,
            "guidance": "Focus on providing clear, structured answers with specific examples from your experience.",
            "timestamp": datetime.now().isoformat()
        }

