"""
Questionnaire Engine Module
Handles adaptive questionnaire logic
"""

import re
import logging
from pathlib import Path
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QuestionnaireEngine:
    """Manages questionnaire loading and adaptive flow"""
    
    def __init__(self, questionnaire_path: str = "questionnaire"):
        """
        Initialize questionnaire engine
        
        Args:
            questionnaire_path: Path to questionnaire directory
        """
        # Get project root directory (assuming this file is in app/ directory)
        project_root = Path(__file__).parent.parent
        self.questionnaire_path = (project_root / questionnaire_path).resolve()
        self.domains = [
            "computer_technology", "medical", "business",
            "engineering", "arts", "sports"
        ]
        # Cache for parsed questions
        self._question_cache: Dict[str, List[Dict]] = {}
    
    def load_questions(self, stage: int, domain: Optional[str] = None) -> List[Dict]:
        """
        Load questions from questionnaire files (with caching)
        
        Args:
            stage: Stage number (1 or 2)
            domain: Domain name for stage 2 questions
            
        Returns:
            List of question dictionaries
        """
        # Create cache key
        if stage == 1:
            cache_key = "stage1"
            file_path = self.questionnaire_path / "stage1_general_questions.txt"
        elif stage == 2:
            if not domain:
                raise ValueError("Domain required for stage 2 questions")
            cache_key = f"stage2_{domain}"
            file_path = self.questionnaire_path / f"stage2_{domain}_questions.txt"
        else:
            raise ValueError(f"Invalid stage: {stage}. Must be 1 or 2.")
        
        # Check cache first
        if cache_key in self._question_cache:
            logger.info(f"Returning cached questions for {cache_key}")
            return self._question_cache[cache_key]
        
        if not file_path.exists():
            raise FileNotFoundError(f"Questionnaire file not found: {file_path}")
        
        # Parse and cache
        questions = self._parse_questions(file_path)
        self._question_cache[cache_key] = questions
        logger.info(f"Loaded and cached {len(questions)} questions from {file_path}")
        return questions
    
    def _parse_questions(self, file_path: Path) -> List[Dict]:
        """
        Parse questions from text file
        
        Args:
            file_path: Path to questionnaire file
            
        Returns:
            List of question dictionaries
        """
        questions = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except Exception as e:
            logger.error(f"Error reading questionnaire file: {e}")
            raise
        
        current_question = None
        current_options = []
        current_number = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if it's a question number
            match = re.match(r'^(\d+)\.\s*(.+)', line)
            if match:
                # Save previous question
                if current_question:
                    questions.append({
                        'number': current_number,
                        'question': current_question,
                        'options': current_options
                    })
                
                current_number = int(match.group(1))
                current_question = match.group(2)
                current_options = []
            elif line.startswith(('a)', 'b)', 'c)', 'd)', 'e)', 'f)')):
                current_options.append(line)
        
        # Add last question
        if current_question:
            questions.append({
                'number': current_number,
                'question': current_question,
                'options': current_options
            })
        
        return questions
    
    def format_question(self, q_data: Dict) -> str:
        """
        Format a question for display
        
        Args:
            q_data: Question dictionary
            
        Returns:
            Formatted question string
        """
        parts = [f"Q{q_data['number']}. {q_data['question']}"]
        
        if q_data.get('options'):
            parts.append("\nOptions:")
            for opt in q_data['options']:
                parts.append(f"  {opt}")
        
        return "\n".join(parts)
    
    def validate_answer(self, q_data: Dict, answer: str) -> bool:
        """
        Validate an answer format
        
        Args:
            q_data: Question dictionary
            answer: User's answer
            
        Returns:
            True if answer is valid
        """
        if not q_data.get('options'):
            # Short answer question
            return len(answer.strip()) > 0
        
        # Multiple choice question
        valid_options = [opt[:opt.find(')')+1] if ')' in opt else opt 
                        for opt in q_data['options']]
        return answer in valid_options
    
    def get_available_domains(self) -> List[str]:
        """Get list of available domains"""
        return self.domains.copy()
    
    def get_domain_questionnaire_exists(self, domain: str) -> bool:
        """
        Check if stage 2 questionnaire exists for a domain
        
        Args:
            domain: Domain name
            
        Returns:
            True if questionnaire file exists
        """
        file_path = self.questionnaire_path / f"stage2_{domain}_questions.txt"
        return file_path.exists()

