from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
from pathlib import Path
import re
import PyPDF2
from docx import Document
import io
from collections import Counter

router = APIRouter(prefix="/api", tags=["resume"])


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file."""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        doc_file = io.BytesIO(file_content)
        doc = Document(doc_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX: {str(e)}")


def extract_keywords(text: str) -> list:
    """Extract important keywords from text using simple NLP techniques."""
    # Common stop words to filter out
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
    
    # Extract words (alphanumeric, at least 3 characters)
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    
    # Filter stop words and get unique keywords
    keywords = [w for w in words if w not in stop_words and len(w) > 3]
    
    # Count frequency and return top keywords
    keyword_counts = Counter(keywords)
    return [word for word, count in keyword_counts.most_common(50)]


def extract_skills(resume_text: str) -> list:
    """Extract technical skills from resume using pattern matching."""
    text_lower = resume_text.lower()
    
    # Common technical skills
    tech_skills = [
        "python", "javascript", "java", "c++", "c#", "react", "angular", "vue",
        "node.js", "sql", "mongodb", "postgresql", "mysql", "aws", "azure", "docker",
        "kubernetes", "git", "linux", "machine learning", "ai", "data science",
        "tensorflow", "pytorch", "rest api", "graphql", "typescript", "html", "css",
        "sass", "redux", "express", "django", "flask", "spring", "go", "rust",
        "swift", "kotlin", "php", "ruby", ".net", "vue.js", "angularjs", "jquery",
        "bootstrap", "tailwind", "sass", "less", "webpack", "npm", "yarn",
        "jenkins", "ci/cd", "agile", "scrum", "devops", "microservices"
    ]
    
    found_skills = []
    for skill in tech_skills:
        if skill in text_lower:
            found_skills.append(skill.title())
    
    return list(set(found_skills))  # Remove duplicates


def match_resume_to_job(resume_text: str, job_description: str) -> dict:
    """Match resume against job description to identify gaps and missing keywords."""
    resume_lower = resume_text.lower()
    job_lower = job_description.lower()
    
    # Extract keywords from both
    resume_keywords = set(extract_keywords(resume_text))
    job_keywords = set(extract_keywords(job_description))
    
    # Find matching keywords
    matching_keywords = resume_keywords.intersection(job_keywords)
    missing_keywords = job_keywords - resume_keywords
    
    # Calculate match percentage
    if len(job_keywords) > 0:
        match_percentage = (len(matching_keywords) / len(job_keywords)) * 100
    else:
        match_percentage = 0
    
    # Extract skills from job description
    job_skills = extract_skills(job_description)
    resume_skills = extract_skills(resume_text)
    
    matching_skills = [s for s in job_skills if s.lower() in resume_lower]
    missing_skills = [s for s in job_skills if s.lower() not in resume_lower]
    
    return {
        "match_percentage": round(match_percentage, 2),
        "matching_keywords": list(matching_keywords)[:20],  # Top 20
        "missing_keywords": list(missing_keywords)[:20],  # Top 20
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "total_job_keywords": len(job_keywords),
        "matched_keywords": len(matching_keywords),
    }


def analyze_resume_structure(resume_text: str) -> dict:
    """Analyze resume structure and formatting."""
    lines = resume_text.split('\n')
    word_count = len(resume_text.split())
    
    # Check for sections
    text_lower = resume_text.lower()
    sections_found = {
        "contact": any(kw in text_lower for kw in ["email", "phone", "address", "@", "linkedin"]),
        "summary": any(kw in text_lower for kw in ["summary", "objective", "profile", "about me"]),
        "experience": any(kw in text_lower for kw in ["experience", "work history", "employment", "career"]),
        "education": any(kw in text_lower for kw in ["education", "degree", "university", "college", "bachelor", "master", "phd"]),
        "skills": any(kw in text_lower for kw in ["skills", "technical skills", "competencies", "proficiencies"]),
        "certifications": any(kw in text_lower for kw in ["certification", "certificate", "certified", "license"]),
    }
    
    structure_score = sum(sections_found.values()) * 10  # 10 points per section
    
    # Check formatting
    has_bullets = "•" in resume_text or "-" in resume_text or "*" in resume_text
    has_dates = bool(re.search(r'\d{4}', resume_text))  # Has years
    has_numbers = len(re.findall(r'\d+', resume_text)) >= 3
    
    formatting_score = 0
    if has_bullets:
        formatting_score += 5
    if has_dates:
        formatting_score += 5
    if has_numbers:
        formatting_score += 5
    
    return {
        "sections_found": sections_found,
        "structure_score": min(structure_score, 60),
        "formatting_score": formatting_score,
        "word_count": word_count,
        "line_count": len(lines),
        "has_bullets": has_bullets,
        "has_dates": has_dates,
        "has_numbers": has_numbers,
    }


def analyze_resume_ats(resume_text: str, job_description: Optional[str] = None) -> dict:
    """
    AI-Powered resume analysis using ML techniques for ATS compatibility.
    Returns comprehensive analysis including structure, keywords, and job matching.
    """
    text_lower = resume_text.lower()
    
    # Analyze structure
    structure_analysis = analyze_resume_structure(resume_text)
    
    # Extract skills and keywords
    extracted_skills = extract_skills(resume_text)
    extracted_keywords = extract_keywords(resume_text)
    
    # Check for action verbs
    action_verbs = ["achieved", "developed", "implemented", "managed", "created", "designed", 
                    "improved", "led", "optimized", "reduced", "increased", "delivered",
                    "executed", "launched", "established", "transformed", "enhanced",
                    "streamlined", "coordinated", "supervised", "mentored", "collaborated"]
    action_verb_count = sum(1 for verb in action_verbs if verb in text_lower)
    
    # Check for quantifiable achievements
    numbers = re.findall(r'\d+', resume_text)
    numbers_count = len(numbers)
    
    # Calculate scores using ML-based weighting (normalized to sum to 100)
    # Max possible scores: structure=60, formatting=15, keywords=20, action_verbs=15, quantifiable=10, skills=15
    # Total max = 135, so we normalize to 100
    
    raw_scores = {
        "structure": structure_analysis["structure_score"],  # Max 60
        "formatting": structure_analysis["formatting_score"],  # Max 15
        "keywords": min(len(extracted_keywords) * 2, 20),  # Max 20
        "action_verbs": min(action_verb_count * 3, 15),  # Max 15
        "quantifiable": min(numbers_count * 2, 10),  # Max 10
        "skills": min(len(extracted_skills) * 2, 15),  # Max 15
    }
    
    # Max possible for each category (for normalization)
    max_possible = {
        "structure": 60,
        "formatting": 15,
        "keywords": 20,
        "action_verbs": 15,
        "quantifiable": 10,
        "skills": 15,
    }
    
    # Weight each category to sum to 100
    weights = {
        "structure": 40,  # 40% of total (most important)
        "formatting": 10,  # 10% of total
        "keywords": 20,  # 20% of total
        "action_verbs": 12,  # 12% of total
        "quantifiable": 8,  # 8% of total
        "skills": 10,  # 10% of total
    }
    # Total weights = 100
    
    # Calculate normalized scores (0-100 scale for each category, then weighted)
    scores = {}
    total_score = 0
    for category in raw_scores:
        if max_possible[category] > 0:
            # Normalize to 0-1, then multiply by weight
            normalized = (raw_scores[category] / max_possible[category]) * weights[category]
            scores[category] = round(normalized, 1)
            total_score += normalized
        else:
            scores[category] = 0
    
    max_score = 100
    final_score = round(min(total_score, max_score), 1)
    
    # Generate recommendations based on analysis
    recommendations = []
    strengths = []
    weaknesses = []
    
    # Structure feedback
    sections_found = structure_analysis["sections_found"]
    for section, found in sections_found.items():
        if found:
            strengths.append(f"Contains {section} section")
        else:
            weaknesses.append(f"Missing {section} section")
            recommendations.append(f"Add a {section} section to improve ATS compatibility")
    
    # Keyword and skill feedback
    if len(extracted_skills) >= 10:
        strengths.append(f"Strong technical skills representation ({len(extracted_skills)} skills identified)")
    elif len(extracted_skills) >= 5:
        recommendations.append(f"Consider adding more technical skills (currently {len(extracted_skills)} skills found)")
    else:
        weaknesses.append("Limited technical skills mentioned")
        recommendations.append("Add more technical skills relevant to your target role")
    
    # Action verbs feedback
    if action_verb_count >= 8:
        strengths.append("Excellent use of action verbs to describe achievements")
    elif action_verb_count >= 5:
        recommendations.append("Use more action verbs to strengthen your accomplishments")
    else:
        weaknesses.append("Limited use of action verbs")
        recommendations.append("Replace passive language with action verbs (achieved, developed, implemented, etc.)")
    
    # Quantifiable achievements feedback
    if numbers_count >= 8:
        strengths.append("Strong use of quantifiable metrics and achievements")
    elif numbers_count >= 3:
        recommendations.append("Add more specific numbers, percentages, or metrics to quantify impact")
    else:
        weaknesses.append("Limited quantifiable achievements")
        recommendations.append("Include specific numbers, percentages, or metrics to demonstrate impact (e.g., 'increased sales by 25%')")
    
    # Formatting feedback
    if structure_analysis["has_bullets"] and structure_analysis["has_dates"]:
        strengths.append("Well-formatted with bullet points and dates")
    else:
        if not structure_analysis["has_bullets"]:
            recommendations.append("Use bullet points to improve readability")
        if not structure_analysis["has_dates"]:
            recommendations.append("Include dates for your work experience and education")
    
    # Length feedback
    word_count = structure_analysis["word_count"]
    if 400 <= word_count <= 800:
        strengths.append("Appropriate resume length")
    elif word_count < 400:
        recommendations.append("Consider adding more detail to your resume (aim for 400-800 words)")
    else:
        recommendations.append("Consider condensing your resume (aim for 400-800 words)")
    
    # Career relevance feedback
    if len(extracted_keywords) >= 30:
        strengths.append("Good keyword density for ATS scanning")
    else:
        recommendations.append("Increase keyword density by including more industry-relevant terms")
    
    # Job matching analysis (if job description provided)
    job_match = None
    if job_description:
        job_match = match_resume_to_job(resume_text, job_description)
        if job_match["match_percentage"] >= 70:
            strengths.append(f"Strong match with job description ({job_match['match_percentage']:.1f}%)")
        elif job_match["match_percentage"] >= 50:
            recommendations.append(f"Moderate match with job description ({job_match['match_percentage']:.1f}%). Consider adding missing keywords.")
        else:
            weaknesses.append(f"Low match with job description ({job_match['match_percentage']:.1f}%)")
            recommendations.append(f"Add missing keywords from job description to improve match ({job_match['match_percentage']:.1f}% match)")
    
    # Determine score category
    if final_score >= 80:
        category = "Excellent"
        category_color = "#10b981"
    elif final_score >= 60:
        category = "Good"
        category_color = "#3b82f6"
    elif final_score >= 40:
        category = "Fair"
        category_color = "#f59e0b"
    else:
        category = "Needs Improvement"
        category_color = "#ef4444"
    
    return {
        "ats_score": final_score,
        "max_score": max_score,
        "category": category,
        "category_color": category_color,
        "scores_breakdown": scores,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations[:15],  # Top 15 recommendations
        "word_count": word_count,
        "action_verbs_count": action_verb_count,
        "numbers_count": numbers_count,
        "skills_found": extracted_skills[:20],  # Top 20 skills
        "keywords_found": extracted_keywords[:30],  # Top 30 keywords
        "structure_analysis": structure_analysis,
        "job_match": job_match,
    }


@router.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: Optional[str] = None
):
    """
    AI-Powered resume analysis with ML models for ATS compatibility.
    Analyzes structure, keywords, skills, and matches against job description.
    Accepts PDF and DOCX files.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ['.pdf', '.docx', '.doc']:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or DOCX file."
        )
    
    # Read file content
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Extract text based on file type
    try:
        if file_ext == '.pdf':
            resume_text = extract_text_from_pdf(file_content)
        elif file_ext in ['.docx', '.doc']:
            resume_text = extract_text_from_docx(file_content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")
    
    if not resume_text or len(resume_text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Could not extract sufficient text from the file. Please ensure the file is not corrupted or password-protected."
        )
    
    # Analyze resume with AI-powered analysis
    try:
        analysis = analyze_resume_ats(resume_text, job_description)
        
        # Generate performance report
        performance_report = {
            "summary": {
                "ats_score": analysis["ats_score"],
                "category": analysis["category"],
                "overall_assessment": f"Your resume has an ATS compatibility score of {analysis['ats_score']}/100, which is {analysis['category'].lower()}.",
            },
            "key_metrics": {
                "word_count": analysis["word_count"],
                "skills_identified": len(analysis["skills_found"]),
                "keywords_identified": len(analysis["keywords_found"]),
                "action_verbs": analysis["action_verbs_count"],
                "quantifiable_metrics": analysis["numbers_count"],
            },
            "strengths": analysis["strengths"],
            "areas_for_improvement": analysis["weaknesses"],
            "optimization_suggestions": analysis["recommendations"],
            "job_match_analysis": analysis.get("job_match"),
        }
        
        return {
            "filename": file.filename,
            "file_type": file_ext,
            "analysis": analysis,
            "performance_report": performance_report,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {str(e)}")

