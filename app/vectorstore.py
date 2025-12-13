"""
Vector Store Module
Manages FAISS index for efficient similarity search
"""

import logging
import pickle
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import numpy as np
import faiss

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorStore:
    """Manages FAISS vector store for similarity search"""
    
    def __init__(self, index_path: str = "data/faiss_index.index", metadata_path: str = "data/metadata.pkl"):
        """
        Initialize vector store
        
        Args:
            index_path: Path to save/load FAISS index
            metadata_path: Path to save/load metadata
        """
        self.index_path = Path(index_path)
        self.metadata_path = Path(metadata_path)
        self.index: Optional[faiss.Index] = None
        self.metadata: List[Dict] = []
        self.dimension: int = 384  # Dimension for all-MiniLM-L6-v2
        
        # Create data directory if it doesn't exist
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        self.metadata_path.parent.mkdir(parents=True, exist_ok=True)
    
    def create_index(self, dimension: int = 384):
        """
        Create a new FAISS index
        
        Args:
            dimension: Dimension of the embedding vectors
        """
        self.dimension = dimension
        # Use L2 distance (Euclidean) for similarity search
        self.index = faiss.IndexFlatL2(dimension)
        self.metadata = []
        logger.info(f"Created new FAISS index with dimension {dimension}")
    
    def add_vectors(self, vectors: np.ndarray, metadata: List[Dict]):
        """
        Add vectors and metadata to the index
        
        Args:
            vectors: Numpy array of embedding vectors
            metadata: List of metadata dictionaries for each vector
        """
        if self.index is None:
            self.create_index(vectors.shape[1])
        
        if len(metadata) != vectors.shape[0]:
            raise ValueError("Number of vectors must match number of metadata entries")
        
        # Convert to float32 for FAISS
        vectors = vectors.astype('float32')
        
        # Add to index
        self.index.add(vectors)
        
        # Add metadata
        self.metadata.extend(metadata)
        
        logger.info(f"Added {len(metadata)} vectors to index. Total: {self.index.ntotal}")
    
    def search(self, query_vector: np.ndarray, k: int = 5) -> List[Tuple[Dict, float]]:
        """
        Search for similar vectors
        
        Args:
            query_vector: Query embedding vector
            k: Number of results to return
            
        Returns:
            List of tuples (metadata, distance)
        """
        if self.index is None or self.index.ntotal == 0:
            logger.warning("Index is empty or not initialized")
            return []
        
        # Convert to float32 and reshape
        query_vector = query_vector.astype('float32').reshape(1, -1)
        
        # Search
        distances, indices = self.index.search(query_vector, min(k, self.index.ntotal))
        
        # Get results with metadata
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.metadata):
                results.append((self.metadata[idx], float(distances[0][i])))
        
        return results
    
    def save(self):
        """Save index and metadata to disk"""
        try:
            if self.index is not None:
                faiss.write_index(self.index, str(self.index_path))
                logger.info(f"Saved FAISS index to {self.index_path}")
            
            with open(self.metadata_path, 'wb') as f:
                pickle.dump(self.metadata, f)
            logger.info(f"Saved metadata to {self.metadata_path}")
        except Exception as e:
            logger.error(f"Error saving vector store: {e}")
            raise
    
    def load(self):
        """Load index and metadata from disk"""
        try:
            if self.index_path.exists():
                self.index = faiss.read_index(str(self.index_path))
                logger.info(f"Loaded FAISS index from {self.index_path}")
            else:
                logger.warning(f"Index file not found: {self.index_path}")
                return False
            
            if self.metadata_path.exists():
                with open(self.metadata_path, 'rb') as f:
                    self.metadata = pickle.load(f)
                logger.info(f"Loaded metadata from {self.metadata_path}")
            else:
                logger.warning(f"Metadata file not found: {self.metadata_path}")
                return False
            
            self.dimension = self.index.d
            logger.info(f"Vector store loaded: {self.index.ntotal} vectors, dimension {self.dimension}")
            return True
        except Exception as e:
            logger.error(f"Error loading vector store: {e}")
            return False
    
    def get_stats(self) -> Dict:
        """Get statistics about the vector store"""
        return {
            "total_vectors": self.index.ntotal if self.index else 0,
            "dimension": self.dimension,
            "index_exists": self.index_path.exists(),
            "metadata_exists": self.metadata_path.exists()
        }

