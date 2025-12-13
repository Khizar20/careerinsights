"""
Embeddings Module
Handles text embedding generation using SentenceTransformer
"""

import logging
from typing import List, Optional
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Generates embeddings for text using SentenceTransformer"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize the embedding generator
        
        Args:
            model_name: Name of the SentenceTransformer model to use
        """
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        logger.info(f"Initializing embedding model: {model_name}")
    
    def load_model(self):
        """Load the SentenceTransformer model"""
        try:
            if self.model is None:
                logger.info("Loading SentenceTransformer model...")
                self.model = SentenceTransformer(self.model_name)
                logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading embedding model: {e}")
            raise
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        if self.model is None:
            self.load_model()
        
        try:
            logger.info(f"Generating embeddings for {len(texts)} texts")
            embeddings = self.model.encode(texts, show_progress_bar=False)
            logger.info("Embeddings generated successfully")
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text string to embed
            
        Returns:
            Embedding vector
        """
        return self.generate_embeddings([text])[0]

