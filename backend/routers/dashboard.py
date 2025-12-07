from fastapi import APIRouter, HTTPException
from typing import Optional
import pandas as pd
from collections import Counter
import os
import re
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api", tags=["dashboard"])

# SerpAPI configuration
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
SERPAPI_BASE_URL = "https://serpapi.com/search"

# Global variable for jobs_df - will be set from main.py
jobs_df = None


def set_jobs_df(df):
    """Set the jobs dataframe from main.py"""
    global jobs_df
    jobs_df = df


def fetch_google_jobs_bulk(
    query: str,
    location: Optional[str] = None,
    max_results: int = 100,
) -> list:
    """
    Fetch multiple pages of job postings from Google Jobs API for analysis.
    Returns a list of all job postings.
    """
    if not SERPAPI_KEY:
        return []
    
    all_jobs = []
    next_page_token = None
    pages_fetched = 0
    max_pages = 5  # Limit to 5 pages to avoid excessive API calls
    
    while len(all_jobs) < max_results and pages_fetched < max_pages:
        params = {
            "engine": "google_jobs",
            "api_key": SERPAPI_KEY,
            "q": query,
            "output": "json",
        }
        
        if location and location.lower() != "global":
            params["location"] = location
        
        if next_page_token:
            params["next_page_token"] = next_page_token
        
        try:
            response = requests.get(SERPAPI_BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if "error" in data:
                break
            
            jobs_results = data.get("jobs_results", [])
            all_jobs.extend(jobs_results)
            
            # Get next page token
            next_page_token = None
            if "serpapi_pagination" in data and "next_page_token" in data["serpapi_pagination"]:
                next_page_token = data["serpapi_pagination"]["next_page_token"]
            
            if not next_page_token:
                break
            
            pages_fetched += 1
            
        except Exception as e:
            print(f"Error fetching page {pages_fetched + 1}: {e}")
            break
    
    return all_jobs[:max_results]


def fetch_google_jobs(
    query: str,
    location: Optional[str] = None,
    limit: int = 20,
    next_page_token: Optional[str] = None,
) -> dict:
    """
    Fetch job postings from Google Jobs API via SerpAPI.
    
    Args:
        query: Search query (job title, keywords, etc.)
        location: Geographic location for the search
        limit: Maximum number of results to return
        next_page_token: Token for pagination
        
    Returns:
        Dictionary with job postings and metadata
    """
    if not SERPAPI_KEY:
        raise HTTPException(
            status_code=500,
            detail="SERPAPI_KEY not configured. Please set it in your environment variables.",
        )
    
    params = {
        "engine": "google_jobs",
        "api_key": SERPAPI_KEY,
        "q": query,
        "output": "json",
    }
    
    # Add location if provided
    if location and location.lower() != "global":
        params["location"] = location
    
    # Add pagination token if provided
    if next_page_token:
        params["next_page_token"] = next_page_token
    
    try:
        response = requests.get(SERPAPI_BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Check for errors in the response
        if "error" in data:
            error_msg = data.get("error", "Unknown error")
            # Handle "no results" case gracefully
            if "hasn't returned any results" in error_msg or "no results" in error_msg.lower():
                return {
                    "postings": [],
                    "total": 0,
                    "next_page_token": None,
                }
            # For other errors, still raise exception
            raise HTTPException(
                status_code=500,
                detail=f"SerpAPI error: {error_msg}",
            )
        
        # Extract job results
        jobs_results = data.get("jobs_results", [])
        
        # If no jobs_results key or empty results, return empty
        if not jobs_results:
            return {
                "postings": [],
                "total": 0,
                "next_page_token": None,
            }
        
        # Transform SerpAPI format to our format
        postings = []
        for job in jobs_results[:limit]:
            # Extract salary information
            salary = None
            salary_currency = "USD"
            if "detected_extensions" in job:
                detected = job["detected_extensions"]
                if "salary" in detected:
                    salary_str = detected["salary"]
                    # Try to extract numeric value from salary string
                    salary_match = re.search(r'[\d,]+', salary_str.replace(',', ''))
                    if salary_match:
                        try:
                            salary = int(salary_match.group().replace(',', ''))
                        except ValueError:
                            pass
            
            # Extract location
            location_str = "Unknown Location"
            if "location" in job:
                location_str = job["location"]
            elif "via" in job and "location" in job["via"]:
                location_str = job["via"]["location"]
            
            # Extract company name
            company_name = "Unknown Company"
            if "company_name" in job:
                company_name = job["company_name"]
            elif "via" in job and "name" in job["via"]:
                company_name = job["via"]["name"]
            
            # Extract job type/employment type
            employment_type = "Full-time"
            if "detected_extensions" in job and "schedule_type" in job["detected_extensions"]:
                employment_type = job["detected_extensions"]["schedule_type"]
            
            # Extract description
            description = ""
            if "description" in job and job["description"]:
                description = str(job["description"]) or ""
            
            # Try to extract skills from description or use common tech keywords
            skills_str = ""
            if description:
                # Common tech skills to look for
                tech_skills = [
                    "Python", "JavaScript", "Java", "C++", "C#", "React", "Angular", "Vue",
                    "Node.js", "SQL", "MongoDB", "PostgreSQL", "AWS", "Azure", "Docker",
                    "Kubernetes", "Git", "Linux", "Machine Learning", "AI", "Data Science",
                    "TensorFlow", "PyTorch", "REST API", "GraphQL", "TypeScript", "HTML",
                    "CSS", "SASS", "Redux", "Express", "Django", "Flask", "Spring"
                ]
                found_skills = []
                desc_lower = description.lower()
                for skill in tech_skills:
                    if skill.lower() in desc_lower:
                        found_skills.append(skill)
                
                if found_skills:
                    skills_str = ", ".join(found_skills[:10])  # Limit to 10 skills
                else:
                    # If no specific skills found, use first 200 chars of description
                    skills_str = description[:200]
            
            # Extract job ID
            job_id = job.get("job_id", job.get("title", ""))
            
            # Try to extract experience level from title or description
            experience_level = "Not specified"
            title_lower = (job.get("title", "") or "").lower()
            desc_lower = description.lower() if description else ""
            if any(word in title_lower or word in desc_lower for word in ["senior", "sr", "lead", "principal", "staff"]):
                experience_level = "Senior"
            elif any(word in title_lower or word in desc_lower for word in ["junior", "jr", "entry", "associate", "intern"]):
                experience_level = "Entry-level"
            elif any(word in title_lower or word in desc_lower for word in ["mid", "intermediate"]):
                experience_level = "Mid-level"
            
            # Extract apply link safely
            apply_link = ""
            apply_options = job.get("apply_options")
            if apply_options and isinstance(apply_options, list) and len(apply_options) > 0:
                first_option = apply_options[0]
                if isinstance(first_option, dict):
                    apply_link = first_option.get("link", "")
            
            posting = {
                "job_id": str(job_id),
                "job_title": job.get("title", "Unknown"),
                "company_name": company_name,
                "company_location": location_str,
                "salary": salary,
                "salary_currency": salary_currency,
                "experience_level": experience_level,
                "employment_type": employment_type,
                "remote_ratio": 0,  # Google Jobs API doesn't provide this directly
                "skills": skills_str,
                "company_size": "Unknown",  # Google Jobs API doesn't provide this
                "posted_date": None,  # Google Jobs API doesn't always provide this
                "description": description,
                "apply_link": apply_link,
            }
            postings.append(posting)
        
        # Get pagination info
        next_page_token = None
        if "serpapi_pagination" in data and "next_page_token" in data["serpapi_pagination"]:
            next_page_token = data["serpapi_pagination"]["next_page_token"]
        
        return {
            "postings": postings,
            "total": len(postings),
            "next_page_token": next_page_token,
        }
        
    except requests.exceptions.RequestException as e:
        print(f"RequestException in fetch_google_jobs: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to fetch jobs from Google Jobs API: {str(e)}",
        )
    except Exception as e:
        import traceback
        print(f"Exception in fetch_google_jobs: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error processing job search: {str(e)}",
        )


@router.get("/trends")
def get_trends(
    region: Optional[str] = None,
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    job_title: Optional[str] = None,
):
    """
    Get labor market trends and salary insights from Google Jobs API.
    """
    if not SERPAPI_KEY:
        raise HTTPException(
            status_code=500,
            detail="SERPAPI_KEY not configured. Please set it in your environment variables.",
        )
    
    # Construct query
    query_parts = []
    if job_title:
        query_parts.append(job_title)
    elif industry and industry.lower() not in ["all industries", "all", ""]:
        industry_lower = industry.lower()
        industry_jobs = {
            "technology": "software engineer",
            "tech": "software engineer",
            "software": "software engineer",
            "it": "IT specialist",
            "data": "data scientist",
            "ai": "AI engineer",
            "machine learning": "machine learning engineer",
            "finance": "financial analyst",
            "healthcare": "healthcare professional",
            "marketing": "marketing specialist",
            "sales": "sales representative",
            "education": "teacher",
            "engineering": "engineer",
        }
        job_title_from_industry = None
        for key, title in industry_jobs.items():
            if key in industry_lower:
                job_title_from_industry = title
                break
        if job_title_from_industry:
            query_parts.append(job_title_from_industry)
        else:
            query_parts.append(industry)
    
    if experience and experience.lower() not in ["all levels", "all", ""]:
        exp_lower = experience.lower()
        if "entry" in exp_lower or "junior" in exp_lower:
            query_parts.append("entry level")
        elif "senior" in exp_lower or "lead" in exp_lower:
            query_parts.append("senior")
        elif "mid" in exp_lower:
            query_parts.append("mid level")
    
    if not query_parts:
        query_parts.append("software engineer")
    
    query = " ".join(query_parts)
    location_param = None
    if region and region.lower() not in ["global", ""]:
        location_param = region
    
    # Fetch jobs from Google Jobs API
    try:
        jobs_data = fetch_google_jobs_bulk(query, location_param, max_results=100)
        
        if not jobs_data:
            return {
                "region": region or "Global",
                "industry": industry or "All industries",
                "experience": experience or "All levels",
                "job_title": job_title or "All titles",
                "in_demand_skills": [],
                "salary_insights": [],
            }
        
        # Extract skills from job descriptions
        all_skills_list = []
        tech_skills = [
            "Python", "JavaScript", "Java", "C++", "C#", "React", "Angular", "Vue",
            "Node.js", "SQL", "MongoDB", "PostgreSQL", "AWS", "Azure", "Docker",
            "Kubernetes", "Git", "Linux", "Machine Learning", "AI", "Data Science",
            "TensorFlow", "PyTorch", "REST API", "GraphQL", "TypeScript", "HTML",
            "CSS", "SASS", "Redux", "Express", "Django", "Flask", "Spring",
            "Go", "Rust", "Swift", "Kotlin", "PHP", "Ruby", ".NET", "Vue.js"
        ]
        
        for job in jobs_data:
            description = job.get("description", "").lower()
            for skill in tech_skills:
                if skill.lower() in description:
                    all_skills_list.append(skill)
        
        # Count skills and determine trends
        skill_counts = Counter(all_skills_list)
        top_skills = skill_counts.most_common(10)
        max_count = max(skill_counts.values()) if skill_counts else 1
        
        skill_trends = []
        for skill, count in top_skills[:5]:
            trend = "rising" if count >= max_count * 0.3 else "stable"
            skill_trends.append({"skill": skill, "trend": trend})
        
        # Extract salary insights
        salary_insights = []
        salary_by_title = {}
        
        for job in jobs_data:
            title = job.get("title", "Unknown")
            salary = None
            
            # Try to extract salary from detected_extensions
            if "detected_extensions" in job and "salary" in job["detected_extensions"]:
                salary_str = job["detected_extensions"]["salary"]
                # Handle salary ranges (e.g., "$50,000 - $80,000" or "50k-80k")
                # Extract all numbers from the string
                salary_numbers = re.findall(r'[\d,]+', salary_str.replace(',', ''))
                if salary_numbers:
                    try:
                        # If it's a range, calculate the average
                        if len(salary_numbers) >= 2:
                            # Range: take average of min and max
                            min_sal = int(salary_numbers[0])
                            max_sal = int(salary_numbers[-1])
                            salary = (min_sal + max_sal) // 2
                        else:
                            # Single value
                            salary = int(salary_numbers[0])
                    except ValueError:
                        pass
            
            # Also check for salary in other possible locations
            if not salary and "salary" in job:
                salary_str = str(job["salary"])
                salary_numbers = re.findall(r'[\d,]+', salary_str.replace(',', ''))
                if salary_numbers:
                    try:
                        if len(salary_numbers) >= 2:
                            min_sal = int(salary_numbers[0])
                            max_sal = int(salary_numbers[-1])
                            salary = (min_sal + max_sal) // 2
                        else:
                            salary = int(salary_numbers[0])
                    except ValueError:
                        pass
            
            # Add salary to the collection if found
            if salary and salary > 0:
                if title not in salary_by_title:
                    salary_by_title[title] = []
                salary_by_title[title].append(salary)
        
        # Calculate median salaries by job title
        for title, salaries in salary_by_title.items():
            if len(salaries) >= 1:  # Include even single salary data point
                # For single value, use it directly; for multiple, calculate median
                if len(salaries) == 1:
                    median_sal = salaries[0]
                else:
                    median_sal = sorted(salaries)[len(salaries) // 2]
                salary_insights.append({
                    "role": title,
                    "median": median_sal,
                })
        
        # Sort by median salary and take top 5
        salary_insights.sort(key=lambda x: x["median"], reverse=True)
        salary_insights = salary_insights[:5]
        
        return {
            "region": region or "Global",
            "industry": industry or "All industries",
            "experience": experience or "All levels",
            "job_title": job_title or "All titles",
            "in_demand_skills": skill_trends,
            "salary_insights": salary_insights,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching trends from Google Jobs API: {str(e)}",
        )


@router.get("/jobs")
def get_jobs(
    region: Optional[str] = None,
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    job_title: Optional[str] = None,
):
    """
    Get job openings and growth projections from Google Jobs API.
    """
    if not SERPAPI_KEY:
        raise HTTPException(
            status_code=500,
            detail="SERPAPI_KEY not configured. Please set it in your environment variables.",
        )
    
    # Construct query
    query_parts = []
    if job_title:
        query_parts.append(job_title)
    elif industry and industry.lower() not in ["all industries", "all", ""]:
        industry_lower = industry.lower()
        industry_jobs = {
            "technology": "software engineer",
            "tech": "software engineer",
            "software": "software engineer",
            "it": "IT specialist",
            "data": "data scientist",
            "ai": "AI engineer",
            "machine learning": "machine learning engineer",
            "finance": "financial analyst",
            "healthcare": "healthcare professional",
            "marketing": "marketing specialist",
            "sales": "sales representative",
            "education": "teacher",
            "engineering": "engineer",
        }
        job_title_from_industry = None
        for key, title in industry_jobs.items():
            if key in industry_lower:
                job_title_from_industry = title
                break
        if job_title_from_industry:
            query_parts.append(job_title_from_industry)
        else:
            query_parts.append(industry)
    
    if experience and experience.lower() not in ["all levels", "all", ""]:
        exp_lower = experience.lower()
        if "entry" in exp_lower or "junior" in exp_lower:
            query_parts.append("entry level")
        elif "senior" in exp_lower or "lead" in exp_lower:
            query_parts.append("senior")
        elif "mid" in exp_lower:
            query_parts.append("mid level")
    
    if not query_parts:
        query_parts.append("software engineer")
    
    query = " ".join(query_parts)
    location_param = None
    if region and region.lower() not in ["global", ""]:
        location_param = region
    
    # Fetch jobs from Google Jobs API
    try:
        jobs_data = fetch_google_jobs_bulk(query, location_param, max_results=100)
        
        if not jobs_data:
            return {
                "filters": {
                    "region": region or "Global",
                    "industry": industry or "Technology",
                    "experience": experience or "Mid-level",
                    "job_title": job_title or "All titles",
                },
                "source": "google_jobs_api",
                "openings": [],
            }
        
        # Count jobs by title
        title_counts = Counter()
        for job in jobs_data:
            title = job.get("title", "Unknown")
            title_counts[title] += 1
        
        # Get top 5 job titles
        top_titles = title_counts.most_common(5)
        
        openings = []
        for title, count in top_titles:
            # Estimate growth based on job availability (more jobs = higher growth)
            # This is a simplified heuristic since we don't have historical data
            total_jobs = len(jobs_data)
            growth = min(0.30, max(0.05, (count / total_jobs) * 2)) if total_jobs > 0 else 0.15
            
            openings.append({
                "title": title,
                "openings": count,
                "growth": round(growth, 2),
            })
        
        return {
            "filters": {
                "region": region or "Global",
                "industry": industry or "Technology",
                "experience": experience or "Mid-level",
                "job_title": job_title or "All titles",
            },
            "source": "google_jobs_api",
            "openings": openings,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching jobs from Google Jobs API: {str(e)}",
        )


@router.get("/job-postings")
def get_job_postings(
    q: Optional[str] = None,
    region: Optional[str] = None,
    industry: Optional[str] = None,
    experience: Optional[str] = None,
    job_title: Optional[str] = None,
    limit: int = 20,
    next_page_token: Optional[str] = None,
):
    """
    Get actual job postings from Google Jobs API via SerpAPI.
    
    Query parameters:
    - q: Search query (job title, keywords, etc.). If not provided, will construct from job_title/industry/experience.
    - job_title: Job title filter (used to construct query if q is not provided)
    - region: Geographic location for the search
    - industry: Industry filter (used to construct query if q is not provided)
    - experience: Experience level (used to construct query if q is not provided)
    - limit: Maximum number of results (default: 20)
    - next_page_token: Token for pagination
    """
    # Construct query if not provided
    if not q:
        query_parts = []
        
        # Use job_title if provided
        if job_title:
            query_parts.append(job_title)
        # Add industry-specific job titles if industry is provided
        elif industry and industry.lower() not in ["all industries", "all", ""]:
            industry_lower = industry.lower()
            # Map common industries to relevant job titles
            industry_jobs = {
                "technology": "software engineer",
                "tech": "software engineer",
                "software": "software engineer",
                "it": "IT specialist",
                "data": "data scientist",
                "ai": "AI engineer",
                "machine learning": "machine learning engineer",
                "finance": "financial analyst",
                "healthcare": "healthcare professional",
                "marketing": "marketing specialist",
                "sales": "sales representative",
                "education": "teacher",
                "engineering": "engineer",
            }
            
            # Check if we have a specific job title for this industry
            job_title_from_industry = None
            for key, title in industry_jobs.items():
                if key in industry_lower:
                    job_title_from_industry = title
                    break
            
            if job_title_from_industry:
                query_parts.append(job_title_from_industry)
            else:
                query_parts.append(industry)
        
        # Add experience level to query if provided
        if experience and experience.lower() not in ["all levels", "all", ""]:
            exp_lower = experience.lower()
            if "entry" in exp_lower or "junior" in exp_lower:
                if not query_parts:
                    query_parts.append("entry level")
                else:
                    query_parts.append("entry level")
            elif "senior" in exp_lower or "lead" in exp_lower:
                if not query_parts:
                    query_parts.append("senior")
                else:
                    query_parts.append("senior")
            elif "mid" in exp_lower:
                if not query_parts:
                    query_parts.append("mid level")
                else:
                    query_parts.append(experience)
        
        # Default to a useful generic query if nothing specified
        if not query_parts:
            query_parts.append("software engineer")  # Better default than just "jobs"
        
        q = " ".join(query_parts)
    
    # Handle "Global" region - don't pass it to SerpAPI, let it use default location
    location_param = None
    if region and region.lower() not in ["global", ""]:
        location_param = region
    
    try:
        result = fetch_google_jobs(
            query=q,
            location=location_param,
            limit=limit,
            next_page_token=next_page_token,
        )
        
        # Ensure result has the expected structure
        if not result:
            result = {
                "postings": [],
                "total": 0,
                "next_page_token": None,
            }
        
        return {
            "filters": {
                "query": q,
                "region": region or "Global",
                "industry": industry or "All industries",
                "experience": experience or "All levels",
                "job_title": job_title or "All titles",
            },
            "source": "google_jobs_api",
            "postings": result.get("postings", []),
            "total": result.get("total", 0),
            "next_page_token": result.get("next_page_token"),
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Exception in get_job_postings: {str(e)}")
        print(traceback.format_exc())
        # Return empty result instead of raising error for better UX
        return {
            "filters": {
                "query": q,
                "region": region or "Global",
                "industry": industry or "All industries",
                "experience": experience or "All levels",
                "job_title": job_title or "All titles",
            },
            "source": "google_jobs_api",
            "postings": [],
            "total": 0,
            "next_page_token": None,
        }


@router.get("/filters")
def get_filters():
    """
    Return distinct filter options (region, industry, experience)
    derived from the dataset so the frontend can build dynamic dropdowns.
    """
    # Common regions for Google Jobs API searches
    common_regions = [
        "Global",
        "United States",
        "United Kingdom",
        "Canada",
        "Australia",
        "India",
        "Pakistan",
        "Germany",
        "France",
        "Netherlands",
        "Singapore",
        "United Arab Emirates",
        "Saudi Arabia",
        "South Africa",
        "Brazil",
        "Mexico",
        "Japan",
        "South Korea",
        "China",
        "New York, NY",
        "San Francisco, CA",
        "London, UK",
        "Toronto, Canada",
        "Sydney, Australia",
        "Dubai, UAE",
        "Karachi, Pakistan",
        "Lahore, Pakistan",
        "Islamabad, Pakistan",
    ]
    
    # Get regions from dataset if available
    dataset_regions = []
    if jobs_df is not None:
        def unique_values(column: str):
            if column not in jobs_df.columns:
                return []
            values = (
                jobs_df[column]
                .dropna()
                .astype(str)
                .str.strip()
                .replace("", pd.NA)
                .dropna()
                .unique()
            )
            # Sort case-insensitively
            return sorted(values, key=lambda x: x.lower())
        
        dataset_regions = unique_values("region")
        industries = unique_values("industry")
        experiences = unique_values("experience_level")
    else:
        # If dataset not loaded, return empty lists for industries and experiences
        industries = []
        experiences = []
    
    # Combine common regions with dataset regions, removing duplicates
    all_regions = list(dict.fromkeys(common_regions + dataset_regions))  # Preserves order, removes duplicates
    
    return {
        "regions": all_regions,
        "industries": industries,
        "experience_levels": experiences,
    }


@router.get("/job-titles")
def get_job_titles(industry: Optional[str] = None):
    """
    Return job titles based on industry.
    If industry is provided, returns job titles for that industry.
    Otherwise, returns common job titles across all industries.
    """
    # Define job titles by industry
    industry_job_titles = {
        "technology": [
            "Software Engineer",
            "Software Developer",
            "Full Stack Developer",
            "Frontend Developer",
            "Backend Developer",
            "DevOps Engineer",
            "Cloud Engineer",
            "System Administrator",
            "Network Engineer",
            "IT Support Specialist",
        ],
        "tech": [
            "Software Engineer",
            "Software Developer",
            "Full Stack Developer",
            "Frontend Developer",
            "Backend Developer",
            "DevOps Engineer",
            "Cloud Engineer",
            "System Administrator",
            "Network Engineer",
            "IT Support Specialist",
        ],
        "software": [
            "Software Engineer",
            "Software Developer",
            "Full Stack Developer",
            "Frontend Developer",
            "Backend Developer",
            "Mobile Developer",
            "Game Developer",
            "Embedded Systems Engineer",
        ],
        "data": [
            "Data Scientist",
            "Data Analyst",
            "Data Engineer",
            "Business Analyst",
            "Machine Learning Engineer",
            "Data Architect",
            "Business Intelligence Analyst",
        ],
        "ai": [
            "AI Engineer",
            "Machine Learning Engineer",
            "Deep Learning Engineer",
            "NLP Engineer",
            "Computer Vision Engineer",
            "AI Research Scientist",
        ],
        "machine learning": [
            "Machine Learning Engineer",
            "ML Engineer",
            "Data Scientist",
            "AI Engineer",
            "ML Research Scientist",
        ],
        "finance": [
            "Financial Analyst",
            "Investment Analyst",
            "Risk Analyst",
            "Quantitative Analyst",
            "Financial Advisor",
            "Accountant",
            "Financial Planner",
        ],
        "healthcare": [
            "Healthcare Administrator",
            "Medical Assistant",
            "Nurse",
            "Physician Assistant",
            "Healthcare Data Analyst",
            "Health Information Manager",
        ],
        "marketing": [
            "Marketing Manager",
            "Digital Marketing Specialist",
            "Content Marketing Manager",
            "SEO Specialist",
            "Social Media Manager",
            "Marketing Analyst",
        ],
        "sales": [
            "Sales Representative",
            "Account Executive",
            "Sales Manager",
            "Business Development Representative",
            "Inside Sales Representative",
        ],
        "education": [
            "Teacher",
            "Professor",
            "Education Coordinator",
            "Curriculum Developer",
            "Instructional Designer",
        ],
        "engineering": [
            "Mechanical Engineer",
            "Electrical Engineer",
            "Civil Engineer",
            "Chemical Engineer",
            "Aerospace Engineer",
            "Software Engineer",
        ],
    }
    
    # If industry is provided, try to match it
    if industry and industry.lower() not in ["all industries", "all", ""]:
        industry_lower = industry.lower()
        # Try exact match first
        if industry_lower in industry_job_titles:
            return {"job_titles": industry_job_titles[industry_lower]}
        
        # Try partial match
        for key, titles in industry_job_titles.items():
            if key in industry_lower or industry_lower in key:
                return {"job_titles": titles}
    
    # Return common tech job titles as default
    return {
        "job_titles": [
            "Software Engineer",
            "Software Developer",
            "Data Scientist",
            "Data Analyst",
            "Product Manager",
            "DevOps Engineer",
            "Full Stack Developer",
            "Frontend Developer",
            "Backend Developer",
            "Machine Learning Engineer",
            "Cloud Engineer",
            "System Administrator",
        ]
    }

