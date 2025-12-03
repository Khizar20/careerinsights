"""
Run RAG System Evaluation
Tests the system on ground truth data and generates BERTScore metrics
"""

import os
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

from app.rag_pipeline import RAGPipeline
from app.mistral_predictor import MistralCareerPredictor
from app.report_generator import MistralReportGenerator
from app.evaluation import RAGEvaluator


def main():
    """Run evaluation"""
    print("\n" + "="*80)
    print(" " * 20 + "RAG System Evaluation")
    print("="*80 + "\n")
    
    # Initialize components
    print("[1/4] Initializing RAG pipeline...")
    rag_pipeline = RAGPipeline()
    if not rag_pipeline.load_index():
        print("Building FAISS index...")
        rag_pipeline.build_index()
    print("✓ RAG pipeline initialized\n")
    
    # Initialize Mistral components
    mistral_key = os.getenv("MISTRAL_API_KEY")
    if not mistral_key:
        print("[ERROR] MISTRAL_API_KEY not found in environment!")
        print("Please set your API key in .env file or environment variable.")
        return
    
    print("[2/4] Initializing Mistral predictor...")
    predictor = MistralCareerPredictor(api_key=mistral_key, rag_pipeline=rag_pipeline)
    print("✓ Predictor initialized\n")
    
    print("[3/4] Initializing report generator...")
    report_generator = MistralReportGenerator(api_key=mistral_key)
    print("✓ Report generator initialized\n")
    
    print("[4/4] Initializing evaluator...")
    evaluator = RAGEvaluator(
        rag_pipeline=rag_pipeline,
        predictor=predictor,
        report_generator=report_generator
    )
    print("✓ Evaluator initialized\n")
    
    # Run evaluation
    print("="*80)
    print("Starting evaluation on ground truth data...")
    print("="*80 + "\n")
    
    results = evaluator.evaluate_all()
    
    # Print report
    evaluator.print_evaluation_report(results)
    
    print("\nEvaluation complete!")


if __name__ == "__main__":
    main()

