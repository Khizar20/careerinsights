"""
Career Counseling (RAG) Router
Integrates RAG-powered Career Prediction endpoints into main backend
"""

import os
import sys
import logging
from pathlib import Path

# CRITICAL: Set up paths BEFORE any other imports
# __file__ is backend/routers/career_counseling.py, so parent.parent.parent = project root
project_root = Path(__file__).parent.parent.parent.absolute()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Ensure user site-packages are in path (where packages might be installed)
import site
user_site = site.getusersitepackages()
if user_site and user_site not in sys.path:
    sys.path.insert(0, user_site)

# Now import other modules
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.debug(f"Python path includes: project_root={project_root}, user_site={user_site}")

router = APIRouter(prefix="/api", tags=["career-counseling"])

# Import RAG modules
RAGPipeline = None
QuestionnaireEngine = None
MistralCareerPredictor = None
MistralReportGenerator = None
SessionManager = None
LearningPathway = None

try:
    from app.session_manager import SessionManager
    logger.info("✅ SessionManager imported successfully")
except ImportError as e:
    logger.error(f"Failed to import SessionManager: {e}")
    import traceback
    logger.error(traceback.format_exc())

try:
    from app.questionnaire_engine import QuestionnaireEngine
    logger.info("✅ QuestionnaireEngine imported successfully")
except ImportError as e:
    logger.warning(f"Failed to import QuestionnaireEngine: {e}")

try:
    from app.learning_pathway import LearningPathway
    logger.info("✅ LearningPathway imported successfully")
except ImportError as e:
    logger.warning(f"Failed to import LearningPathway: {e}")

try:
    from app.rag_pipeline import RAGPipeline
    logger.info("✅ RAGPipeline imported successfully")
except ImportError as e:
    logger.warning(f"Failed to import RAGPipeline: {e}")
    import traceback
    logger.warning(traceback.format_exc())

try:
    from app.mistral_predictor import MistralCareerPredictor
    logger.info("✅ MistralCareerPredictor imported successfully")
except ImportError as e:
    logger.warning(f"Failed to import MistralCareerPredictor: {e}")
    import traceback
    logger.warning(traceback.format_exc())

try:
    from app.report_generator import MistralReportGenerator
    logger.info("✅ MistralReportGenerator imported successfully")
except ImportError as e:
    logger.warning(f"Failed to import MistralReportGenerator: {e}")
    import traceback
    logger.warning(traceback.format_exc())

# Global components (initialized on startup)
rag_pipeline: Optional[RAGPipeline] = None
questionnaire_engine: Optional[QuestionnaireEngine] = None
predictor: Optional[MistralCareerPredictor] = None
report_generator: Optional[MistralReportGenerator] = None
session_manager: Optional[SessionManager] = None
learning_pathway: Optional[LearningPathway] = None


# Pydantic models
class UserProfile(BaseModel):
    name: str
    age: int = Field(..., ge=16, le=100)
    education: str
    interests: str
    skills: str


class CounselorStyleRequest(BaseModel):
    counselor_style: str = Field(..., description="Style: friendly, professional, warm, reflective")


class QuestionAnswer(BaseModel):
    question_number: int
    answer: str


class Stage1Answers(BaseModel):
    answers: List[QuestionAnswer]


class Stage2Answers(BaseModel):
    answers: List[QuestionAnswer]


class ProgressUpdate(BaseModel):
    completed_courses: Optional[List[str]] = None
    completed_certifications: Optional[List[str]] = None
    acquired_skills: Optional[List[str]] = None
    milestones: Optional[List[str]] = None


def initialize_rag_components():
    """Initialize RAG components on startup"""
    global rag_pipeline, questionnaire_engine, predictor, report_generator, session_manager, learning_pathway
    
    try:
        logger.info("Initializing RAG Career Counseling components...")
        
        # Check if classes were imported successfully
        if SessionManager is None:
            logger.error("❌ SessionManager class not available - RAG modules failed to import")
            logger.error("   Please check that all dependencies are installed and app/ directory exists")
            return False
        
        # Initialize session manager (always needed, doesn't require API key)
        try:
            session_manager = SessionManager()
            logger.info("✅ Session Manager initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Session Manager: {e}")
            import traceback
            logger.error(traceback.format_exc())
            session_manager = None
        
        # Initialize questionnaire engine (doesn't require API key)
        if QuestionnaireEngine is not None:
            try:
                questionnaire_path = Path(__file__).parent.parent.parent / "questionnaire"
                if questionnaire_path.exists():
                    questionnaire_engine = QuestionnaireEngine(questionnaire_path=str(questionnaire_path))
                    logger.info("✅ Questionnaire Engine initialized")
                else:
                    logger.warning(f"Questionnaire directory not found at {questionnaire_path}")
                    questionnaire_engine = None
            except Exception as e:
                logger.warning(f"Failed to initialize Questionnaire Engine: {e}")
                import traceback
                logger.warning(traceback.format_exc())
                questionnaire_engine = None
        else:
            logger.warning("QuestionnaireEngine class not available")
            questionnaire_engine = None
        
        # Initialize learning pathway (doesn't require API key)
        if LearningPathway is not None:
            try:
                learning_pathway = LearningPathway()
                logger.info("✅ Learning Pathway initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Learning Pathway: {e}")
                import traceback
                logger.warning(traceback.format_exc())
                learning_pathway = None
        else:
            logger.warning("LearningPathway class not available")
            learning_pathway = None
        
        # Check for Mistral API key for AI features
        mistral_key = os.getenv("MISTRAL_API_KEY")
        if not mistral_key:
            logger.warning("⚠️  MISTRAL_API_KEY not found - Career predictions and reports will be unavailable")
            logger.info("   Session management and questionnaires will still work")
            return True  # Return True because basic features are available
        
        # Initialize RAG pipeline (optional, for enhanced predictions)
        if RAGPipeline is not None:
            try:
                kb_path = Path(__file__).parent.parent.parent / "kb"
                if kb_path.exists():
                    rag_pipeline = RAGPipeline(kb_path=str(kb_path))
                    logger.info("✅ RAG Pipeline initialized")
                else:
                    logger.warning(f"Knowledge base not found at {kb_path}")
                    rag_pipeline = None
            except Exception as e:
                logger.warning(f"Failed to initialize RAG Pipeline: {e}")
                import traceback
                logger.warning(traceback.format_exc())
                rag_pipeline = None
        else:
            logger.warning("RAGPipeline class not available")
            rag_pipeline = None
        
        # Initialize predictor (requires Mistral API key)
        if MistralCareerPredictor is not None:
            try:
                predictor = MistralCareerPredictor(api_key=mistral_key)
                logger.info("✅ Mistral Predictor initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Mistral Predictor: {e}")
                import traceback
                logger.error(traceback.format_exc())
                predictor = None
        else:
            logger.warning("MistralCareerPredictor class not available")
            predictor = None
        
        # Initialize report generator (requires Mistral API key)
        if MistralReportGenerator is not None:
            try:
                report_generator = MistralReportGenerator(api_key=mistral_key)
                logger.info("✅ Report Generator initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Report Generator: {e}")
                import traceback
                logger.error(traceback.format_exc())
                report_generator = None
        else:
            logger.warning("MistralReportGenerator class not available")
            report_generator = None
        
        logger.info("✅ RAG Career Counseling components initialized")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing RAG components: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


@router.get("/counselor-styles")
async def get_counselor_styles():
    """Get available counselor styles"""
    styles = ["friendly", "professional", "warm", "reflective"]
    style_details = [
        {
            "id": style,
            "name": style.capitalize(),
            "description": f"{style.capitalize()} counseling style"
        }
        for style in styles
    ]
    return {"styles": style_details}


@router.get("/questions/stage1")
async def get_stage1_questions():
    """Get Stage 1 questions"""
    try:
        if questionnaire_engine is None:
            raise HTTPException(status_code=500, detail="Questionnaire engine not initialized")
        
        questions = questionnaire_engine.load_questions(1)
        formatted_questions = [
            {
                "number": q["number"],
                "question": q["question"],
                "options": q.get("options", [])
            }
            for q in questions
        ]
        
        return {"questions": formatted_questions}
    except Exception as e:
        logger.error(f"Error loading Stage 1 questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load questions: {str(e)}")


@router.get("/questions/stage2/{domain}")
async def get_stage2_questions(domain: str):
    """Get Stage 2 questions for a domain"""
    try:
        if questionnaire_engine is None:
            raise HTTPException(status_code=500, detail="Questionnaire engine not initialized")
        
        questions = questionnaire_engine.load_questions(2, domain)
        formatted_questions = [
            {
                "number": q["number"],
                "question": q["question"],
                "options": q.get("options", [])
            }
            for q in questions
        ]
        
        return {"questions": formatted_questions, "domain": domain}
    except Exception as e:
        logger.error(f"Error loading Stage 2 questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load questions: {str(e)}")


@router.post("/session/create")
async def create_session(profile: UserProfile, counselor_style: str = "friendly"):
    """Create a new counseling session"""
    global session_manager
    try:
        if session_manager is None:
            # Try to initialize session manager if not already done
            try:
                session_manager = SessionManager()
                logger.info("Session Manager initialized on-demand")
            except Exception as e:
                logger.error(f"Failed to initialize Session Manager: {e}")
                raise HTTPException(
                    status_code=500, 
                    detail="Session manager not available. Please check backend logs."
                )
        
        profile_dict = profile.dict()
        logger.info(
            "Creating new session for user '%s', age %d, education '%s', counselor_style='%s'",
            profile_dict.get("name"),
            profile_dict.get("age"),
            profile_dict.get("education"),
            counselor_style,
        )
        session_id = session_manager.create_session(profile_dict, counselor_style)
        
        logger.info("Session created successfully: session_id=%s", session_id)

        return {
            "session_id": session_id,
            "message": "Session created successfully",
            "counselor_style": counselor_style
        }
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.post("/session/{session_id}/update-style")
async def update_counselor_style(session_id: str, request: CounselorStyleRequest):
    """Update counselor style for a session"""
    try:
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_manager.update_session(
            session_id,
            counselor_style=request.counselor_style
        )
        
        return {"message": "Counselor style updated", "counselor_style": request.counselor_style}
    except Exception as e:
        logger.error(f"Error updating counselor style: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update style: {str(e)}")


@router.post("/session/{session_id}/stage1")
async def submit_stage1(session_id: str, answers: Stage1Answers):
    """Submit Stage 1 answers and get domain prediction"""
    try:
        if predictor is None:
            raise HTTPException(
                status_code=503, 
                detail="Career prediction feature requires MISTRAL_API_KEY. Please set it in backend/.env file to enable AI-powered predictions."
            )
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        # Get session
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Convert answers to dict
        answers_dict = {f"Q{ans.question_number}": ans.answer for ans in answers.answers}
        
        logger.info(
            "Stage 1 submission received: session_id=%s, total_answers=%d",
            session_id,
            len(answers_dict),
        )
        
        # Store answers
        session_manager.update_session(
            session_id,
            stage1_answers=answers_dict
        )
        
        # Get user profile for prediction
        user_profile = session.get("user_profile", {})
        
        # Predict domain using RAG
        # Note: predictor methods return tuples, need to convert to dict
        if rag_pipeline and hasattr(predictor, 'predict_domain_rag'):
            domain, confidence, reasoning = predictor.predict_domain_rag(
                user_profile, answers_dict, rag_pipeline
            )
            domain_result = {
                "domain": domain,
                "confidence": confidence,
                "reasoning": reasoning
            }
        else:
            domain, confidence, reasoning = predictor.predict_domain(user_profile, answers_dict)
            domain_result = {
                "domain": domain,
                "confidence": confidence,
                "reasoning": reasoning
            }
        
        # Update session with prediction
        session_manager.update_session(
            session_id,
            predicted_domain=domain_result["domain"],
            domain_confidence=domain_result["confidence"],
            domain_reasoning=domain_result["reasoning"]
        )
        
        return {
            "predicted_domain": domain_result["domain"],
            "confidence": domain_result["confidence"],
            "reasoning": domain_result["reasoning"],
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error processing Stage 1: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process Stage 1: {str(e)}")


@router.post("/session/{session_id}/stage2")
async def submit_stage2(session_id: str, answers: Stage2Answers):
    """Submit Stage 2 answers and get career prediction"""
    try:
        if predictor is None:
            raise HTTPException(
                status_code=503,
                detail="Career prediction feature requires MISTRAL_API_KEY. Please set it in backend/.env file."
            )
        if report_generator is None:
            raise HTTPException(
                status_code=503,
                detail="Report generation requires MISTRAL_API_KEY. Please set it in backend/.env file."
            )
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        # Get session
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Convert answers to dict
        answers_dict = {f"Q{ans.question_number}": ans.answer for ans in answers.answers}
        
        logger.info(
            "Stage 2 submission received: session_id=%s, total_answers=%d",
            session_id,
            len(answers_dict),
        )
        
        # Store answers
        session_manager.update_session(
            session_id,
            stage2_answers=answers_dict
        )
        
        # Get domain, user profile, and stage1 answers
        domain = session.get("predicted_domain")
        user_profile = session.get("user_profile", {})
        stage1_answers = session.get("stage1_answers", {})
        
        if not domain:
            raise HTTPException(status_code=400, detail="Domain prediction required. Please complete Stage 1 first.")
        
        # Predict career
        # predict_career signature: (profile, stage1_answers, stage2_answers, predicted_domain)
        career, confidence, reasoning = predictor.predict_career(
            user_profile, 
            stage1_answers, 
            answers_dict, 
            domain
        )
        career_result = {
            "career": career,
            "confidence": confidence,
            "reasoning": reasoning
        }
        
        # Get domain confidence and reasoning from session
        domain_confidence = session.get("domain_confidence", 0.75)
        domain_reasoning = session.get("domain_reasoning", "Based on your responses")
        
        # Generate report
        counselor_style = session.get("counselor_style", "friendly")
        report_content = report_generator.generate_report(
            user_profile,
            domain,
            career_result["career"],
            domain_reasoning,
            career_result["reasoning"],
            domain_confidence,
            career_result["confidence"],
            counselor_style
        )
        
        # Generate learning pathway
        pathway_data = None
        if learning_pathway and report_generator:
            try:
                pathway_data = report_generator.generate_learning_pathway(
                    career_result["career"],
                    user_profile
                )
                # Initialize the pathway in the learning_pathway manager
                learning_pathway.initialize_pathway(session_id, pathway_data)
            except Exception as e:
                logger.warning(f"Failed to generate learning pathway: {e}")
                pathway_data = None
        
        session_manager.update_session(
            session_id,
            stage2_answers=answers_dict,
            predicted_career=career_result["career"],
            career_confidence=career_result["confidence"],
            career_reasoning=career_result["reasoning"],
            report=report_content,
            learning_pathway=pathway_data
        )
        
        return {
            "predicted_career": career_result["career"],
            "confidence": career_result["confidence"],
            "reasoning": career_result["reasoning"],
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error processing Stage 2: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process Stage 2: {str(e)}")


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session results"""
    try:
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) as-is
        raise
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")


@router.get("/session/{session_id}/progress")
async def get_progress(session_id: str):
    """Get learning pathway progress"""
    try:
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        pathway = session.get("learning_pathway")
        if not pathway:
            raise HTTPException(status_code=404, detail="Learning pathway not found for this session")
        
        return pathway
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")


@router.post("/session/{session_id}/progress/update")
async def update_progress(session_id: str, update: ProgressUpdate):
    """Update learning pathway progress"""
    try:
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        pathway = session.get("learning_pathway")
        if not pathway:
            raise HTTPException(status_code=404, detail="Learning pathway not found")
        
        # Update progress
        if update.completed_courses:
            pathway.setdefault("completed_courses", []).extend(update.completed_courses)
        if update.completed_certifications:
            pathway.setdefault("completed_certifications", []).extend(update.completed_certifications)
        if update.acquired_skills:
            pathway.setdefault("acquired_skills", []).extend(update.acquired_skills)
        if update.milestones:
            pathway.setdefault("milestones", []).extend(update.milestones)
        
        session_manager.update_session(
            session_id,
            learning_pathway=pathway
        )
        
        return {"message": "Progress updated", "pathway": pathway}
    except Exception as e:
        logger.error(f"Error updating progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")

