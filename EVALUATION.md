# RAG System Evaluation Guide

## Overview

This evaluation module tests the RAG-powered Career Counseling System on ground truth data and generates comprehensive metrics including BERTScore for report quality assessment.

## Ground Truth Data

The ground truth dataset (`evaluation/ground_truth.json`) contains 8 labeled samples with:
- User profiles (name, age, education, interests, skills)
- Stage 1 and Stage 2 questionnaire answers
- Expected domain predictions
- Expected career predictions
- Expected report keywords

## Metrics Calculated

### 1. Prediction Accuracy
- **Domain Accuracy**: Percentage of correct domain predictions
- **Career Accuracy**: Percentage of correct career predictions
- **Average Confidence Scores**: Mean confidence for domain and career predictions

### 2. BERTScore Metrics
- **F1 Score**: Harmonic mean of precision and recall
- **Precision**: How many generated words are relevant
- **Recall**: How many reference words are covered
- **Standard Deviations**: Variability across samples

### 3. Content Quality
- **Keyword Coverage**: Percentage of expected keywords found in generated reports

## Running Evaluation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Note: BERTScore will download the BERT model on first run (~400MB).

### 2. Set Up API Key

Ensure your `.env` file has:
```env
MISTRAL_API_KEY=your_api_key_here
```

### 3. Run Evaluation

```bash
python run_evaluation.py
```

## Evaluation Output

The evaluation generates:

1. **Console Report**: Formatted evaluation results printed to console
2. **JSON Results**: Detailed results saved to `evaluation/evaluation_results.json`

### Sample Output

```
================================================================================
                         RAG SYSTEM EVALUATION REPORT
================================================================================

Total Samples Evaluated: 8

================================================================================
PREDICTION ACCURACY
================================================================================
Domain Prediction Accuracy: 87.5% (7/8)
Career Prediction Accuracy: 75.0% (6/8)

Average Domain Confidence: 78.5%
Average Career Confidence: 76.2%

================================================================================
BERTSCORE METRICS (Report Quality)
================================================================================
BERTScore F1: 0.8234 (±0.0456)
BERTScore Precision: 0.8156 (±0.0523)
BERTScore Recall: 0.8312 (±0.0389)

================================================================================
CONTENT QUALITY
================================================================================
Average Keyword Coverage: 85.3%

================================================================================
DETAILED RESULTS
================================================================================
...
```

## Interpreting Results

### BERTScore Interpretation
- **F1 > 0.80**: Excellent semantic similarity
- **F1 0.70-0.80**: Good semantic similarity
- **F1 0.60-0.70**: Moderate semantic similarity
- **F1 < 0.60**: Poor semantic similarity

### Accuracy Interpretation
- **> 90%**: Excellent prediction accuracy
- **80-90%**: Good prediction accuracy
- **70-80%**: Acceptable prediction accuracy
- **< 70%**: Needs improvement

### Keyword Coverage
- **> 80%**: Reports contain most expected content
- **60-80%**: Reports contain good amount of expected content
- **< 60%**: Reports may be missing key information

## Adding More Ground Truth Samples

Edit `evaluation/ground_truth.json` to add more test cases:

```json
{
  "id": 9,
  "user_profile": {
    "name": "Your Name",
    "age": 25,
    "education": "Your Education",
    "interests": "Your Interests",
    "skills": "Your Skills"
  },
  "stage1_answers": {
    "Q1": "a)",
    ...
  },
  "stage2_answers": {
    "Q1": "a)",
    ...
  },
  "expected_domain": "computer_technology",
  "expected_career": "software_engineer",
  "expected_report_keywords": ["software", "programming", "development"]
}
```

## Troubleshooting

### BERTScore Installation Issues
```bash
# If bert-score fails to install
pip install --upgrade pip
pip install bert-score
```

### Out of Memory
BERTScore requires significant memory. If you encounter memory issues:
- Reduce batch size in bert_score calculation
- Evaluate fewer samples at a time

### API Key Errors
Ensure `MISTRAL_API_KEY` is set in `.env` file or environment variables.

## Notes

- Evaluation may take 5-10 minutes depending on number of samples
- BERTScore calculation is the most time-consuming step
- Results are saved automatically to `evaluation/evaluation_results.json`
- Each evaluation run overwrites previous results

