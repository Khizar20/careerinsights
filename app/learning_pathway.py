"""
Learning Pathway Module
Manages learning roadmaps, progress tracking, and adaptive recommendations
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LearningPathway:
    """Manages learning pathways and progress tracking"""
    
    def __init__(self):
        """Initialize learning pathway manager"""
        self.pathways: Dict[str, Dict] = {}  # session_id -> pathway data
        self.progress: Dict[str, Dict] = {}  # session_id -> progress data
    
    def initialize_pathway(self, session_id: str, pathway_data: Dict):
        """
        Initialize a learning pathway for a session
        
        Args:
            session_id: Session identifier
            pathway_data: Pathway data from report generator
        """
        self.pathways[session_id] = {
            "career": pathway_data.get("career", "unknown"),
            "description": pathway_data.get("description", ""),
            "phases": pathway_data.get("phases", {}),
            "courses": pathway_data.get("courses", []),
            "certifications": pathway_data.get("certifications", []),
            "skills": pathway_data.get("skills", []),
            "milestones": pathway_data.get("milestones", []),
            "created_at": datetime.now().isoformat()
        }
        
        # Initialize progress
        self.progress[session_id] = {
            "current_phase": "foundation",
            "completed_courses": [],
            "completed_certifications": [],
            "completed_skills": [],
            "completed_milestones": [],
            "progress_percentage": 0.0,
            "last_updated": datetime.now().isoformat()
        }
        
        logger.info(f"Initialized learning pathway for session {session_id}")
    
    def update_progress(self, 
                       session_id: str,
                       completed_courses: Optional[List[str]] = None,
                       completed_certifications: Optional[List[str]] = None,
                       completed_skills: Optional[List[str]] = None,
                       completed_milestones: Optional[List[str]] = None,
                       current_phase: Optional[str] = None):
        """
        Update progress for a learning pathway
        
        Args:
            session_id: Session identifier
            completed_courses: List of completed course names
            completed_certifications: List of completed certification names
            completed_skills: List of completed skill names
            completed_milestones: List of completed milestone names
            current_phase: Current learning phase
        """
        if session_id not in self.progress:
            logger.warning(f"Pathway not initialized for session {session_id}")
            return
        
        progress = self.progress[session_id]

        logger.info(
            "Received progress update for session %s: courses=%s, certs=%s, skills=%s, milestones=%s, phase=%s",
            session_id,
            completed_courses,
            completed_certifications,
            completed_skills,
            completed_milestones,
            current_phase,
        )

        # Treat provided lists as the full updated state so we can both
        # mark and unmark items as completed.
        if completed_courses is not None:
            progress["completed_courses"] = list(dict.fromkeys(completed_courses))
        
        if completed_certifications is not None:
            progress["completed_certifications"] = list(dict.fromkeys(completed_certifications))
        
        if completed_skills is not None:
            progress["completed_skills"] = list(dict.fromkeys(completed_skills))
        
        if completed_milestones is not None:
            progress["completed_milestones"] = list(dict.fromkeys(completed_milestones))
        
        if current_phase:
            progress["current_phase"] = current_phase
        
        # Calculate progress percentage
        progress["progress_percentage"] = self._calculate_progress(session_id)
        progress["last_updated"] = datetime.now().isoformat()
        
        logger.info(f"Updated progress for session {session_id}: {progress['progress_percentage']:.1f}%")
    
    def get_pathway(self, session_id: str) -> Optional[Dict]:
        """
        Get learning pathway for a session
        
        Args:
            session_id: Session identifier
            
        Returns:
            Pathway data dictionary or None
        """
        return self.pathways.get(session_id)
    
    def get_progress(self, session_id: str) -> Optional[Dict]:
        """
        Get progress for a session
        
        Args:
            session_id: Session identifier
            
        Returns:
            Progress data dictionary or None
        """
        return self.progress.get(session_id)
    
    def get_recommendations(self, session_id: str) -> Dict:
        """
        Get adaptive recommendations based on progress
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with recommendations
        """
        pathway = self.get_pathway(session_id)
        progress = self.get_progress(session_id)
        
        if not pathway or not progress:
            return {"recommendations": []}
        
        recommendations = []
        
        # Recommend next courses
        all_courses = pathway.get("courses", [])
        completed_courses = progress.get("completed_courses", [])
        next_courses = [c for c in all_courses if c not in completed_courses]
        if next_courses:
            recommendations.append({
                "type": "course",
                "title": "Next Recommended Course",
                "description": next_courses[0],
                "priority": "high"
            })
        
        # Recommend certifications
        all_certifications = pathway.get("certifications", [])
        completed_certifications = progress.get("completed_certifications", [])
        next_certifications = [c for c in all_certifications if c not in completed_certifications]
        if next_certifications:
            recommendations.append({
                "type": "certification",
                "title": "Recommended Certification",
                "description": next_certifications[0],
                "priority": "medium"
            })
        
        # Recommend skills to develop
        all_skills = pathway.get("skills", [])
        completed_skills = progress.get("completed_skills", [])
        next_skills = [s for s in all_skills if s not in completed_skills]
        if next_skills:
            recommendations.append({
                "type": "skill",
                "title": "Skill to Develop",
                "description": next_skills[0],
                "priority": "medium"
            })
        
        # Phase transition recommendations
        current_phase = progress.get("current_phase", "foundation")
        if current_phase == "foundation" and progress["progress_percentage"] >= 50:
            recommendations.append({
                "type": "phase",
                "title": "Ready for Intermediate Phase",
                "description": "You've completed the foundation phase. Consider moving to intermediate learning.",
                "priority": "high"
            })
        
        return {"recommendations": recommendations}
    
    def _calculate_progress(self, session_id: str) -> float:
        """
        Calculate overall progress percentage
        
        Args:
            session_id: Session identifier
            
        Returns:
            Progress percentage (0.0 to 100.0)
        """
        pathway = self.pathways.get(session_id)
        progress = self.progress.get(session_id)
        
        if not pathway or not progress:
            return 0.0
        
        total_items = 0
        completed_items = 0
        
        # Courses
        courses = pathway.get("courses", [])
        total_items += len(courses)
        completed_items += len(progress.get("completed_courses", []))
        
        # Certifications
        certifications = pathway.get("certifications", [])
        total_items += len(certifications)
        completed_items += len(progress.get("completed_certifications", []))
        
        # Skills
        skills = pathway.get("skills", [])
        total_items += len(skills)
        completed_items += len(progress.get("completed_skills", []))
        
        # Milestones
        milestones = pathway.get("milestones", [])
        total_items += len(milestones)
        completed_items += len(progress.get("completed_milestones", []))
        
        if total_items == 0:
            return 0.0
        
        return (completed_items / total_items) * 100.0

