"""
Session Manager Module
Manages user sessions, profiles, and predictions
"""

import logging
import json
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime
import uuid
import os

from app.mongo_client import get_collection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SessionManager:
    """Manages user sessions and data storage"""

    def __init__(self, data_dir: str = "data/sessions"):
        """
        Initialize session manager

        Args:
            data_dir: Directory to store session data
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.sessions: Dict[str, Dict] = {}

        # Optional MongoDB backing store (if MONGODB_URI is configured)
        self.use_mongo = bool(os.getenv("MONGODB_URI"))
        self._mongo_collection = None
        if self.use_mongo:
            try:
                self._mongo_collection = get_collection("sessions")
                logger.info("Session manager configured to use MongoDB collection 'sessions'")
            except Exception as e:
                logger.error(f"Failed to initialize MongoDB for sessions: {e}")
                self.use_mongo = False

        logger.info(f"Initialized session manager with data directory: {data_dir}")

    def create_session(self, profile: Dict, counselor_style: str = "friendly") -> str:
        """
        Create a new session
        
        Args:
            profile: User profile dictionary
            counselor_style: Counselor communication style
            
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())

        session_data = {
            "session_id": session_id,
            "user_profile": profile,
            "counselor_style": counselor_style,
            "stage1_answers": {},
            "stage2_answers": {},
            "predicted_domain": None,
            "domain_confidence": None,
            "domain_reasoning": None,
            "predicted_career": None,
            "career_confidence": None,
            "career_reasoning": None,
            "report": None,
            "learning_pathway": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        self.sessions[session_id] = session_data
        self._save_session(session_id)

        if self.use_mongo and self._mongo_collection is not None:
            try:
                self._mongo_collection.insert_one(session_data)
                logger.info("Session stored in MongoDB: %s", session_id)
            except Exception as e:
                logger.error("Error storing session in MongoDB (%s): %s", session_id, e)

        logger.info(f"Created new session: {session_id}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """
        Get session data
        
        Args:
            session_id: Session identifier
            
        Returns:
            Session data dictionary or None
        """
        # Try to load from disk if not in memory
        if session_id not in self.sessions:
            self._load_session(session_id)

        session = self.sessions.get(session_id)
        return self._sanitize_session(session)
    
    def update_session(self, 
                       session_id: str,
                       stage1_answers: Optional[Dict] = None,
                       stage2_answers: Optional[Dict] = None,
                       predicted_domain: Optional[str] = None,
                       domain_confidence: Optional[float] = None,
                       domain_reasoning: Optional[str] = None,
                       predicted_career: Optional[str] = None,
                       career_confidence: Optional[float] = None,
                       career_reasoning: Optional[str] = None,
                       report: Optional[str] = None,
                       learning_pathway: Optional[Dict] = None,
                       counselor_style: Optional[str] = None):
        """
        Update session data
        
        Args:
            session_id: Session identifier
            **kwargs: Fields to update
        """
        if session_id not in self.sessions:
            logger.warning(f"Session not found: {session_id}")
            return

        session = self.sessions[session_id]

        # Apply updates in memory
        if stage1_answers is not None:
            session["stage1_answers"] = stage1_answers
        if stage2_answers is not None:
            session["stage2_answers"] = stage2_answers
        if predicted_domain is not None:
            session["predicted_domain"] = predicted_domain
        if domain_confidence is not None:
            session["domain_confidence"] = domain_confidence
        if domain_reasoning is not None:
            session["domain_reasoning"] = domain_reasoning
        if predicted_career is not None:
            session["predicted_career"] = predicted_career
        if career_confidence is not None:
            session["career_confidence"] = career_confidence
        if career_reasoning is not None:
            session["career_reasoning"] = career_reasoning
        if report is not None:
            session["report"] = report
        if learning_pathway is not None:
            session["learning_pathway"] = learning_pathway
        if counselor_style is not None:
            session["counselor_style"] = counselor_style

        session["updated_at"] = datetime.now().isoformat()

        # Persist to local JSON file
        self._save_session(session_id)

        # Also persist to MongoDB if enabled
        if self.use_mongo and self._mongo_collection is not None:
            try:
                # Do a partial update with $set so predictions / report / pathway
                # are always kept in sync for this session_id.
                mongo_doc = {k: v for k, v in session.items() if k != "_id"}
                self._mongo_collection.update_one(
                    {"session_id": session_id},
                    {"$set": mongo_doc},
                    upsert=True,
                )
                logger.info("Session updated in MongoDB: %s", session_id)
            except Exception as e:
                logger.error("Error updating session in MongoDB (%s): %s", session_id, e)

        logger.info(f"Updated session: {session_id}")

    def _sanitize_session(self, session: Optional[Dict]) -> Optional[Dict]:
        """
        Return a copy of the session dict without MongoDB-specific fields
        that are not JSON-serializable (like _id: ObjectId).
        """
        if not session:
            return session
        if "_id" in session:
            clean = dict(session)
            clean.pop("_id", None)
            return clean
        return session

    def _save_session(self, session_id: str):
        """Save session to local JSON file"""
        if session_id not in self.sessions:
            return

        session = self._sanitize_session(self.sessions[session_id])
        session_file = self.data_dir / f"{session_id}.json"
        try:
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving session {session_id}: {e}")
    
    def _load_session(self, session_id: str) -> bool:
        """Load session from disk"""
        session_file = self.data_dir / f"{session_id}.json"
        if not session_file.exists():
            return False
        
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
                self.sessions[session_id] = session_data
                logger.info(f"Loaded session from disk: {session_id}")
                return True
        except Exception as e:
            logger.error(f"Error loading session {session_id}: {e}")
            return False
    
    def list_sessions(self) -> List[str]:
        """List all session IDs"""
        # Load all session files
        session_files = list(self.data_dir.glob("*.json"))
        session_ids = [f.stem for f in session_files]
        return session_ids

