"""
RAG Pipeline Module
Orchestrates retrieval-augmented generation for career prediction
"""

import logging
from typing import List, Dict, Optional
from pathlib import Path
import numpy as np

from app.embeddings import EmbeddingGenerator
from app.vectorstore import VectorStore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RAGPipeline:
    """RAG pipeline for retrieving relevant career information"""
    
    def __init__(self, 
                 kb_path: str = "kb",
                 index_path: str = "data/faiss_index.index",
                 metadata_path: str = "data/metadata.pkl"):
        """
        Initialize RAG pipeline
        
        Args:
            kb_path: Path to knowledge base directory
            index_path: Path to FAISS index
            metadata_path: Path to metadata file
        """
        # Get project root directory (assuming this file is in app/ directory)
        project_root = Path(__file__).parent.parent
        self.kb_path = (project_root / kb_path).resolve()
        index_path_abs = (project_root / index_path).resolve()
        metadata_path_abs = (project_root / metadata_path).resolve()
        
        self.embedding_generator = EmbeddingGenerator()
        self.vectorstore = VectorStore(str(index_path_abs), str(metadata_path_abs))
        self._knowledge_base_loaded = False
    
    def build_index(self):
        """Build FAISS index from knowledge base files"""
        logger.info("Building FAISS index from knowledge base...")
        
        # Load knowledge base
        texts = []
        metadata = []
        
        # Load domain files
        domains_path = self.kb_path / "domains"
        if domains_path.exists():
            for domain_file in domains_path.glob("*.txt"):
                with open(domain_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    texts.append(content)
                    metadata.append({
                        "type": "domain",
                        "name": domain_file.stem,
                        "content": content
                    })
        
        # Load career files
        careers_path = self.kb_path / "careers"
        if careers_path.exists():
            for career_file in careers_path.glob("*.txt"):
                with open(career_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    texts.append(content)
                    metadata.append({
                        "type": "career",
                        "name": career_file.stem,
                        "content": content
                    })
        
        if not texts:
            logger.warning("No knowledge base files found")
            return
        
        # Generate embeddings
        logger.info(f"Generating embeddings for {len(texts)} documents...")
        embeddings = self.embedding_generator.generate_embeddings(texts)
        embeddings_array = np.array(embeddings)
        
        # Add to vector store
        self.vectorstore.add_vectors(embeddings_array, metadata)
        
        # Save index
        self.vectorstore.save()
        
        logger.info(f"Index built successfully with {len(texts)} documents")
        self._knowledge_base_loaded = True
    
    def load_index(self) -> bool:
        """Load existing FAISS index"""
        success = self.vectorstore.load()
        if success:
            self._knowledge_base_loaded = True
        return success
    
    def retrieve(self, query: str, k: int = 5) -> List[Dict]:
        """
        Retrieve relevant documents for a query
        
        Args:
            query: Query text
            k: Number of results to return
            
        Returns:
            List of relevant documents with metadata
        """
        if not self._knowledge_base_loaded:
            if not self.load_index():
                logger.warning("Index not loaded. Building new index...")
                self.build_index()
        
        # Generate query embedding
        query_embedding = np.array(self.embedding_generator.generate_embedding(query))
        
        # Search
        results = self.vectorstore.search(query_embedding, k=k)
        
        # Format results
        retrieved_docs = []
        for metadata, distance in results:
            retrieved_docs.append({
                "type": metadata.get("type"),
                "name": metadata.get("name"),
                "content": metadata.get("content"),
                "relevance_score": 1.0 / (1.0 + distance)  # Convert distance to similarity
            })
        
        logger.info(f"Retrieved {len(retrieved_docs)} documents for query: {query[:50]}...")
        return retrieved_docs
    
    def get_context_for_domain(self, domain: str) -> str:
        """
        Get context information for a specific domain
        
        Args:
            domain: Domain name
            
        Returns:
            Context string about the domain
        """
        query = f"{domain} domain career information"
        results = self.retrieve(query, k=3)
        
        context_parts = []
        for result in results:
            if result["type"] == "domain" and domain.lower() in result["name"].lower():
                context_parts.append(result["content"])
        
        return "\n\n".join(context_parts)
    
    def get_context_for_career(self, career: str) -> str:
        """
        Get context information for a specific career
        
        Args:
            career: Career name
            
        Returns:
            Context string about the career
        """
        query = f"{career} career information responsibilities skills"
        results = self.retrieve(query, k=3)
        
        context_parts = []
        for result in results:
            if result["type"] == "career" and career.lower() in result["name"].lower():
                context_parts.append(result["content"])
        
        return "\n\n".join(context_parts)

