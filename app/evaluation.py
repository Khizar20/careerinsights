"""
Evaluation Module
Evaluates RAG system performance using ground truth data and BERTScore
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple
import os
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.mistral_predictor import MistralCareerPredictor
from app.report_generator import MistralReportGenerator
from app.rag_pipeline import RAGPipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from bert_score import score
    BERTSCORE_AVAILABLE = True
except ImportError:
    BERTSCORE_AVAILABLE = False
    logger.warning("BERTScore not available. Install with: pip install bert-score")


class RAGEvaluator:
    """Evaluates RAG system performance"""
    
    def __init__(self, 
                 ground_truth_path: str = "evaluation/ground_truth.json",
                 rag_pipeline=None,
                 predictor=None,
                 report_generator=None):
        """
        Initialize evaluator
        
        Args:
            ground_truth_path: Path to ground truth JSON file
            rag_pipeline: RAG pipeline instance
            predictor: Career predictor instance
            report_generator: Report generator instance
        """
        self.ground_truth_path = Path(ground_truth_path)
        self.rag_pipeline = rag_pipeline
        self.predictor = predictor
        self.report_generator = report_generator
        self.ground_truth_data = []
        
    def load_ground_truth(self) -> List[Dict]:
        """Load ground truth data from JSON file"""
        try:
            with open(self.ground_truth_path, 'r', encoding='utf-8') as f:
                self.ground_truth_data = json.load(f)
            logger.info(f"Loaded {len(self.ground_truth_data)} ground truth samples")
            return self.ground_truth_data
        except Exception as e:
            logger.error(f"Error loading ground truth data: {e}")
            return []
    
    def evaluate_sample(self, sample: Dict) -> Dict:
        """
        Evaluate a single ground truth sample
        
        Args:
            sample: Ground truth sample dictionary
            
        Returns:
            Evaluation results dictionary
        """
        try:
            profile = sample["user_profile"]
            stage1_answers = sample["stage1_answers"]
            stage2_answers = sample["stage2_answers"]
            expected_domain = sample["expected_domain"]
            expected_career = sample["expected_career"]
            
            # Predict domain
            predicted_domain, domain_confidence, domain_reasoning = self.predictor.predict_domain(
                profile, stage1_answers
            )
            
            # Predict career
            predicted_career, career_confidence, career_reasoning = self.predictor.predict_career(
                profile, stage1_answers, stage2_answers, predicted_domain
            )
            
            # Generate report
            report = self.report_generator.generate_report(
                profile, predicted_domain, predicted_career,
                domain_reasoning, career_reasoning,
                domain_confidence, career_confidence, "friendly"
            )
            
            # Calculate accuracy
            domain_correct = predicted_domain.lower() == expected_domain.lower()
            career_correct = predicted_career.lower() == expected_career.lower()
            
            return {
                "sample_id": sample["id"],
                "expected_domain": expected_domain,
                "predicted_domain": predicted_domain,
                "domain_correct": domain_correct,
                "domain_confidence": domain_confidence,
                "expected_career": expected_career,
                "predicted_career": predicted_career,
                "career_correct": career_correct,
                "career_confidence": career_confidence,
                "report": report,
                "expected_keywords": sample.get("expected_report_keywords", [])
            }
            
        except Exception as e:
            logger.error(f"Error evaluating sample {sample.get('id', 'unknown')}: {e}")
            return {
                "sample_id": sample.get("id", "unknown"),
                "error": str(e)
            }
    
    def calculate_bertscore(self, generated_reports: List[str], reference_reports: List[str]) -> Dict:
        """
        Calculate BERTScore for generated reports
        
        Args:
            generated_reports: List of generated report texts
            reference_reports: List of reference report texts
            
        Returns:
            Dictionary with BERTScore metrics
        """
        if not BERTSCORE_AVAILABLE:
            return {
                "precision": None,
                "recall": None,
                "f1": None,
                "message": "BERTScore not available. Install with: pip install bert-score"
            }
        
        try:
            logger.info("Calculating BERTScore...")
            P, R, F1 = score(generated_reports, reference_reports, lang='en', verbose=True)
            
            return {
                "precision": P.mean().item(),
                "recall": R.mean().item(),
                "f1": F1.mean().item(),
                "precision_std": P.std().item(),
                "recall_std": R.std().item(),
                "f1_std": F1.std().item()
            }
        except Exception as e:
            logger.error(f"Error calculating BERTScore: {e}")
            return {
                "precision": None,
                "recall": None,
                "f1": None,
                "error": str(e)
            }
    
    def generate_reference_reports(self, samples: List[Dict]) -> List[str]:
        """
        Generate reference reports based on expected predictions
        
        Args:
            samples: List of ground truth samples
            
        Returns:
            List of reference report texts
        """
        reference_reports = []
        
        for sample in samples:
            profile = sample["user_profile"]
            expected_domain = sample["expected_domain"]
            expected_career = sample["expected_career"]
            
            # Create a reference report based on expected predictions
            name = profile.get("name", "there")
            domain_name = expected_domain.replace('_', ' ').title()
            career_name = expected_career.replace('_', ' ').title()
            interests = profile.get("interests", "")
            skills = profile.get("skills", "")
            
            reference_report = f"""Hello {name},

I'm excited to share your career prediction results with you! After carefully analyzing your profile, interests, and questionnaire responses, I believe we've found a career path that aligns beautifully with who you are.

Your recommended career is {career_name} within the {domain_name} domain. This recommendation is based on how well your interests, skills, and responses match the characteristics and requirements of this field.

What makes this career particularly interesting for you is how it connects with your background. Your interests in {interests} and skills in {skills} create a strong foundation for success in {career_name}. The {domain_name} domain offers opportunities that resonate with what you've shared about your preferences and goals.

As you consider this path, I'd encourage you to take some practical next steps. Start by researching {career_name} in more detail - look into the day-to-day responsibilities, the work environment, and the growth opportunities. Connect with professionals already working in this field to get firsthand insights. Explore the educational pathways and certifications that could help you get started, and begin building the specific skills that will make you competitive.

Remember, career exploration is a journey, and this recommendation is a starting point. Take time to reflect on how this path feels to you, and don't hesitate to explore related careers within {domain_name} as well.

I'm confident that with your background and interests, you have what it takes to succeed in {career_name}. Trust your instincts, stay curious, and take those first steps toward building the career you want.

Best of luck on your journey ahead!"""
            
            reference_reports.append(reference_report)
        
        return reference_reports
    
    def evaluate_all(self) -> Dict:
        """
        Evaluate all ground truth samples
        
        Returns:
            Comprehensive evaluation results
        """
        if not self.ground_truth_data:
            self.load_ground_truth()
        
        if not self.ground_truth_data:
            return {"error": "No ground truth data loaded"}
        
        logger.info(f"Evaluating {len(self.ground_truth_data)} samples...")
        
        results = []
        generated_reports = []
        
        for sample in self.ground_truth_data:
            result = self.evaluate_sample(sample)
            results.append(result)
            
            if "report" in result:
                generated_reports.append(result["report"])
        
        # Calculate metrics
        domain_correct = sum(1 for r in results if r.get("domain_correct", False))
        career_correct = sum(1 for r in results if r.get("career_correct", False))
        total_samples = len(results)
        
        domain_accuracy = domain_correct / total_samples if total_samples > 0 else 0
        career_accuracy = career_correct / total_samples if total_samples > 0 else 0
        
        # Calculate average confidence
        avg_domain_confidence = sum(r.get("domain_confidence", 0) for r in results) / total_samples if total_samples > 0 else 0
        avg_career_confidence = sum(r.get("career_confidence", 0) for r in results) / total_samples if total_samples > 0 else 0
        
        # Generate reference reports for BERTScore
        reference_reports = self.generate_reference_reports(self.ground_truth_data)
        
        # Calculate BERTScore
        bertscore_results = self.calculate_bertscore(generated_reports, reference_reports)
        
        # Calculate keyword coverage
        keyword_scores = []
        for i, result in enumerate(results):
            if "report" in result and "expected_keywords" in result:
                report_lower = result["report"].lower()
                expected_keywords = [kw.lower() for kw in result["expected_keywords"]]
                found_keywords = sum(1 for kw in expected_keywords if kw in report_lower)
                keyword_coverage = found_keywords / len(expected_keywords) if expected_keywords else 0
                keyword_scores.append(keyword_coverage)
        
        avg_keyword_coverage = sum(keyword_scores) / len(keyword_scores) if keyword_scores else 0
        
        return {
            "total_samples": total_samples,
            "domain_accuracy": domain_accuracy,
            "career_accuracy": career_accuracy,
            "domain_correct": domain_correct,
            "career_correct": career_correct,
            "avg_domain_confidence": avg_domain_confidence,
            "avg_career_confidence": avg_career_confidence,
            "bertscore": bertscore_results,
            "avg_keyword_coverage": avg_keyword_coverage,
            "detailed_results": results
        }
    
    def print_evaluation_report(self, results: Dict):
        """Print formatted evaluation report"""
        print("\n" + "="*80)
        print(" " * 25 + "RAG SYSTEM EVALUATION REPORT")
        print("="*80 + "\n")
        
        print(f"Total Samples Evaluated: {results['total_samples']}")
        print(f"\n{'='*80}")
        print("PREDICTION ACCURACY")
        print(f"{'='*80}")
        print(f"Domain Prediction Accuracy: {results['domain_accuracy']:.1%} ({results['domain_correct']}/{results['total_samples']})")
        print(f"Career Prediction Accuracy: {results['career_accuracy']:.1%} ({results['career_correct']}/{results['total_samples']})")
        print(f"\nAverage Domain Confidence: {results['avg_domain_confidence']:.1%}")
        print(f"Average Career Confidence: {results['avg_career_confidence']:.1%}")
        
        print(f"\n{'='*80}")
        print("BERTSCORE METRICS (Report Quality)")
        print(f"{'='*80}")
        if results['bertscore'].get('f1') is not None:
            print(f"BERTScore F1: {results['bertscore']['f1']:.4f} (±{results['bertscore'].get('f1_std', 0):.4f})")
            print(f"BERTScore Precision: {results['bertscore']['precision']:.4f} (±{results['bertscore'].get('precision_std', 0):.4f})")
            print(f"BERTScore Recall: {results['bertscore']['recall']:.4f} (±{results['bertscore'].get('recall_std', 0):.4f})")
        else:
            print(f"BERTScore: {results['bertscore'].get('message', 'Not available')}")
        
        print(f"\n{'='*80}")
        print("CONTENT QUALITY")
        print(f"{'='*80}")
        print(f"Average Keyword Coverage: {results['avg_keyword_coverage']:.1%}")
        
        print(f"\n{'='*80}")
        print("DETAILED RESULTS")
        print(f"{'='*80}")
        for result in results['detailed_results']:
            if 'error' in result:
                print(f"\nSample {result['sample_id']}: ERROR - {result['error']}")
            else:
                domain_status = "✓" if result['domain_correct'] else "✗"
                career_status = "✓" if result['career_correct'] else "✗"
                print(f"\nSample {result['sample_id']}:")
                print(f"  Domain: {domain_status} Expected: {result['expected_domain']}, Predicted: {result['predicted_domain']} (Confidence: {result['domain_confidence']:.1%})")
                print(f"  Career: {career_status} Expected: {result['expected_career']}, Predicted: {result['predicted_career']} (Confidence: {result['career_confidence']:.1%})")
        
        print(f"\n{'='*80}\n")
        
        # Save results to file
        output_file = Path("evaluation/evaluation_results.json")
        output_file.parent.mkdir(exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"Detailed results saved to: {output_file}")

