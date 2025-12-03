"""
Main API/CLI Interface
FastAPI backend for Career Prediction Engine
"""

import os
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env file from project root
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        logging.info(f"Loaded environment variables from {env_path}")
    else:
        logging.warning(f".env file not found at {env_path}")
except ImportError:
    logging.warning("python-dotenv not installed. Using system environment variables only.")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uvicorn

# Import modules
from app.rag_pipeline import RAGPipeline
from app.questionnaire_engine import QuestionnaireEngine
from app.mistral_predictor import MistralCareerPredictor
from app.report_generator import MistralReportGenerator
from app.session_manager import SessionManager
from app.learning_pathway import LearningPathway

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Career Prediction Engine API",
    description="RAG-powered Career Prediction and Learning Pathway System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global components
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
    completed_skills: Optional[List[str]] = None
    completed_milestones: Optional[List[str]] = None
    current_phase: Optional[str] = None


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize components on startup"""
    global rag_pipeline, questionnaire_engine, predictor, report_generator, session_manager, learning_pathway
    
    logger.info("Initializing Career Prediction Engine...")
    
    try:
        # Initialize questionnaire engine (doesn't require API keys)
        questionnaire_engine = QuestionnaireEngine()
        logger.info("Questionnaire engine initialized")
        
        # Initialize session manager
        session_manager = SessionManager()
        logger.info("Session manager initialized")
        
        # Initialize learning pathway
        learning_pathway = LearningPathway()
        logger.info("Learning pathway manager initialized")
        
        # Initialize RAG pipeline
        try:
            rag_pipeline = RAGPipeline()
            # Try to load existing index, build if not found
            if not rag_pipeline.load_index():
                logger.info("Building new FAISS index...")
                rag_pipeline.build_index()
            logger.info("RAG pipeline initialized")
        except Exception as e:
            logger.warning(f"RAG pipeline initialization failed: {e}. Continuing without RAG...")
            rag_pipeline = None
        
        # Initialize Mistral components (require API key)
        mistral_api_key = os.getenv("MISTRAL_API_KEY")
        if mistral_api_key:
            try:
                predictor = MistralCareerPredictor(api_key=mistral_api_key, rag_pipeline=rag_pipeline)
                report_generator = MistralReportGenerator(api_key=mistral_api_key)
                logger.info("Mistral components initialized")
            except Exception as e:
                logger.warning(f"Mistral initialization failed: {e}")
                predictor = None
                report_generator = None
        else:
            logger.warning("MISTRAL_API_KEY not found. Mistral features will be unavailable.")
        
        logger.info("Career Prediction Engine initialized successfully")
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise


# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Career Prediction Engine API is running",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "ok",
        "components": {
            "rag_pipeline": rag_pipeline is not None,
            "questionnaire_engine": questionnaire_engine is not None,
            "predictor": predictor is not None,
            "report_generator": report_generator is not None,
            "session_manager": session_manager is not None,
            "learning_pathway": learning_pathway is not None
        }
    }


@app.get("/api/counselor-styles")
async def get_counselor_styles():
    """Get available counselor styles"""
    styles = MistralReportGenerator.get_available_styles()
    style_details = []
    for style_name in styles:
        style_info = MistralReportGenerator.get_style_info(style_name)
        style_details.append({
            "id": style_name,
            "name": style_info["name"],
            "description": style_info["description"]
        })
    return {"styles": style_details}


@app.get("/api/questions/stage1")
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


@app.get("/api/questions/stage2/{domain}")
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


@app.post("/api/session/create")
async def create_session(profile: UserProfile, counselor_style: str = "friendly"):
    """Create a new counseling session"""
    try:
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
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


@app.post("/api/session/{session_id}/stage1")
async def submit_stage1(session_id: str, answers: Stage1Answers):
    """Submit Stage 1 answers and get domain prediction"""
    try:
        if predictor is None:
            raise HTTPException(status_code=500, detail="Predictor not initialized")
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

        # Update session
        session_manager.update_session(session_id, stage1_answers=answers_dict)
        
        # Predict domain
        profile = session.get("user_profile", {})
        predicted_domain, domain_confidence, domain_reasoning = predictor.predict_domain(
            profile, answers_dict
        )

        logger.info(
            "Domain predicted for session_id=%s: domain=%s, confidence=%.3f",
            session_id,
            predicted_domain,
            domain_confidence,
        )
        
        # Update session with prediction
        session_manager.update_session(
            session_id,
            predicted_domain=predicted_domain,
            domain_confidence=domain_confidence,
            domain_reasoning=domain_reasoning
        )
        
        return {
            "predicted_domain": predicted_domain,
            "domain_confidence": domain_confidence,
            "domain_reasoning": domain_reasoning,
            "message": "Domain predicted successfully"
        }
    except Exception as e:
        logger.error(f"Error in Stage 1 prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to predict domain: {str(e)}")


@app.post("/api/session/{session_id}/stage2")
async def submit_stage2(session_id: str, answers: Stage2Answers):
    """Submit Stage 2 answers and get career prediction"""
    try:
        if predictor is None or report_generator is None:
            raise HTTPException(status_code=500, detail="Predictor or report generator not initialized")
        if session_manager is None or learning_pathway is None:
            raise HTTPException(status_code=500, detail="Session manager or learning pathway not initialized")
        
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

        # Update session
        session_manager.update_session(session_id, stage2_answers=answers_dict)
        
        # Get domain from session
        predicted_domain = session.get("predicted_domain")
        if not predicted_domain:
            raise HTTPException(status_code=400, detail="Domain not predicted. Complete Stage 1 first.")
        
        # Predict career
        profile = session.get("user_profile", {})
        stage1_answers = session.get("stage1_answers", {})
        predicted_career, career_confidence, career_reasoning = predictor.predict_career(
            profile, stage1_answers, answers_dict, predicted_domain
        )

        logger.info(
            "Career predicted for session_id=%s: domain=%s, career=%s, confidence=%.3f",
            session_id,
            predicted_domain,
            predicted_career,
            career_confidence,
        )
        
        # Generate report
        domain_reasoning = session.get("domain_reasoning", "")
        domain_confidence = session.get("domain_confidence", 0.5)
        counselor_style = session.get("counselor_style", "friendly")
        
        report = report_generator.generate_report(
            profile, predicted_domain, predicted_career,
            domain_reasoning, career_reasoning,
            domain_confidence, career_confidence, counselor_style
        )

        logger.info(
            "Career report generated for session_id=%s (report_length=%d chars)",
            session_id,
            len(report) if isinstance(report, str) else 0,
        )
        
        # Generate learning pathway
        pathway = report_generator.generate_learning_pathway(predicted_career, profile)
        
        logger.info(
            "Learning pathway generated for session_id=%s, career=%s",
            session_id,
            predicted_career,
        )

        # Initialize progress tracking
        learning_pathway.initialize_pathway(session_id, pathway)
        
        # Update session
        session_manager.update_session(
            session_id,
            predicted_career=predicted_career,
            career_confidence=career_confidence,
            career_reasoning=career_reasoning,
            report=report,
            learning_pathway=pathway
        )
        
        return {
            "predicted_career": predicted_career,
            "career_confidence": career_confidence,
            "career_reasoning": career_reasoning,
            "report": report,
            "learning_pathway": pathway,
            "message": "Career predicted successfully"
        }
    except Exception as e:
        logger.error(f"Error in Stage 2 prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to predict career: {str(e)}")


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get session details"""
    try:
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")


@app.get("/api/session/{session_id}/progress")
async def get_progress(session_id: str):
    """Get learning pathway progress"""
    try:
        if learning_pathway is None:
            raise HTTPException(status_code=500, detail="Learning pathway not initialized")
        
        progress = learning_pathway.get_progress(session_id)
        pathway = learning_pathway.get_pathway(session_id)
        recommendations = learning_pathway.get_recommendations(session_id)
        
        if not progress:
            raise HTTPException(status_code=404, detail="Progress not found for this session")
        
        return {
            "pathway": pathway,
            "progress": progress,
            "recommendations": recommendations
        }
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")


@app.post("/api/session/{session_id}/progress/update")
async def update_progress(session_id: str, update: ProgressUpdate):
    """Update learning pathway progress"""
    try:
        if learning_pathway is None:
            raise HTTPException(status_code=500, detail="Learning pathway not initialized")
        
        learning_pathway.update_progress(
            session_id,
            completed_courses=update.completed_courses,
            completed_certifications=update.completed_certifications,
            completed_skills=update.completed_skills,
            completed_milestones=update.completed_milestones,
            current_phase=update.current_phase
        )
        
        return {"message": "Progress updated successfully"}
    except Exception as e:
        logger.error(f"Error updating progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")


@app.post("/api/session/{session_id}/update-style")
async def update_counselor_style(session_id: str, style_request: CounselorStyleRequest):
    """Update counselor style for a session"""
    try:
        if session_manager is None:
            raise HTTPException(status_code=500, detail="Session manager not initialized")
        
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_manager.update_session(session_id, counselor_style=style_request.counselor_style)
        
        return {"message": "Counselor style updated successfully"}
    except Exception as e:
        logger.error(f"Error updating counselor style: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update style: {str(e)}")


# CLI mode (for testing)
def run_cli():
    """Run in CLI mode for testing"""
    print("=" * 60)
    print("Career Prediction Engine - CLI Mode")
    print("=" * 60)
    print("\nThis is a backend-only system.")
    print("Start the API server with: python api/main.py")
    print("Or use: uvicorn api.main:app --reload")
    print("\nAPI will be available at: http://localhost:8000")
    print("API docs at: http://localhost:8000/docs")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        run_cli()
    else:
        # Run API server
        port = int(os.getenv("PORT", 8000))
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

