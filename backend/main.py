from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import pandas as pd
from routers import dashboard, resume, interview

app = FastAPI(title="CareerInsights API")

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load dataset on startup
DATA_PATH = Path(__file__).parent / "data"
jobs_df = None


def _normalize(text: str) -> str:
    """Normalize text for comparison."""
    return (text or "").strip().lower()


def _find_column(df: pd.DataFrame, possible_names: list) -> str:
    """Find a column by trying multiple possible names."""
    for name in possible_names:
        if name in df.columns:
            return name
    return None


def load_dataset():
    """Load the Kaggle AI jobs dataset."""
    global jobs_df
    
    # Try common CSV filenames
    csv_files = list(DATA_PATH.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(
            f"No CSV file found in {DATA_PATH}. "
            "Please download the Kaggle dataset and place it in backend/data/"
        )
    
    # Use the first CSV found (or you can specify a name)
    csv_path = csv_files[0]
    jobs_df = pd.read_csv(csv_path)
    
    # Normalize column names to lowercase for easier matching
    jobs_df.columns = jobs_df.columns.str.strip().str.lower()
    
    # Map common column name variations to standard names
    col_mapping = {}
    
    # Job title column
    title_col = _find_column(jobs_df, ["job_title", "title", "role", "position", "job"])
    if title_col:
        col_mapping[title_col] = "job_title"
    
    # Location/region column - check company_location first since that's what the dataset uses
    region_col = _find_column(jobs_df, ["company_location", "location", "region", "country", "city", "location_name", "employee_residence"])
    if region_col:
        col_mapping[region_col] = "region"
    
    # Salary column
    salary_col = _find_column(jobs_df, ["salary", "salary_usd", "compensation", "pay", "salary_in_usd"])
    if salary_col:
        col_mapping[salary_col] = "salary"
    
    # Skills column
    skills_col = _find_column(jobs_df, ["skills", "required_skills", "tags", "technologies", "skill"])
    if skills_col:
        col_mapping[skills_col] = "skills"
    
    # Experience level column
    exp_col = _find_column(jobs_df, ["experience_level", "level", "seniority", "experience", "exp_level"])
    if exp_col:
        col_mapping[exp_col] = "experience_level"
    
    # Industry column
    industry_col = _find_column(jobs_df, ["industry", "sector", "domain", "field"])
    if industry_col:
        col_mapping[industry_col] = "industry"
    
    # Date column
    date_col = _find_column(jobs_df, ["posted_date", "date", "timestamp", "created_at", "posting_date"])
    if date_col:
        col_mapping[date_col] = "posted_date"
    
    # Company name column
    company_col = _find_column(jobs_df, ["company_name", "company", "employer", "organization"])
    if company_col:
        col_mapping[company_col] = "company_name"
    
    # Company size column
    size_col = _find_column(jobs_df, ["company_size", "size", "company_size_category"])
    if size_col:
        col_mapping[size_col] = "company_size"
    
    # Employment type column
    emp_type_col = _find_column(jobs_df, ["employment_type", "job_type", "work_type", "type"])
    if emp_type_col:
        col_mapping[emp_type_col] = "employment_type"
    
    # Remote ratio column
    remote_col = _find_column(jobs_df, ["remote_ratio", "remote", "work_remote", "remote_percentage"])
    if remote_col:
        col_mapping[remote_col] = "remote_ratio"
    
    # Salary currency column
    currency_col = _find_column(jobs_df, ["salary_currency", "currency", "pay_currency"])
    if currency_col:
        col_mapping[currency_col] = "salary_currency"
    
    # Job ID column
    job_id_col = _find_column(jobs_df, ["job_id", "id", "jobid"])
    if job_id_col:
        col_mapping[job_id_col] = "job_id"
    
    # Rename columns
    jobs_df = jobs_df.rename(columns=col_mapping)
    
    # Normalize text columns
    if "job_title" in jobs_df.columns:
        jobs_df["job_title"] = jobs_df["job_title"].astype(str).str.strip()
    if "region" in jobs_df.columns:
        jobs_df["region"] = jobs_df["region"].astype(str).str.strip()
    if "experience_level" in jobs_df.columns:
        jobs_df["experience_level"] = jobs_df["experience_level"].astype(str).str.strip()
    if "industry" in jobs_df.columns:
        jobs_df["industry"] = jobs_df["industry"].astype(str).str.strip()
    
    # Parse salary if present
    if "salary" in jobs_df.columns:
        # Try to convert to numeric, handling common formats
        jobs_df["salary"] = pd.to_numeric(jobs_df["salary"], errors="coerce")
    
    # Parse date if present
    if "posted_date" in jobs_df.columns:
        jobs_df["posted_date"] = pd.to_datetime(jobs_df["posted_date"], errors="coerce")
    
    print(f"Dataset loaded: {len(jobs_df)} rows, columns: {list(jobs_df.columns)}")
    
    # Set jobs_df in dashboard router
    dashboard.set_jobs_df(jobs_df)


@app.on_event("startup")
async def startup_event():
    """Load dataset when the app starts."""
    print("=" * 60)
    print("🚀 CareerInsights API Starting...")
    print("=" * 60)
    
    # Check environment variables
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    serpapi_key = os.getenv("SERPAPI_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if serpapi_key:
        print("✅ SERPAPI_KEY loaded")
    else:
        print("⚠️  SERPAPI_KEY not found - Dashboard job features may be limited")
    
    if gemini_key:
        print("✅ GEMINI_API_KEY loaded")
    else:
        print("⚠️  GEMINI_API_KEY not found - Interview features will use fallback mode")
    
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
    if mongodb_uri and mongodb_uri != "mongodb://localhost:27017/":
        print("✅ MONGODB_URI configured")
    else:
        print("⚠️  MONGODB_URI not configured - Using default localhost MongoDB")
        print("   Interview sessions will use in-memory storage if MongoDB is unavailable")
    
    print("-" * 60)
    
    # Load dataset
    try:
        load_dataset()
        print("✅ Dataset loaded successfully")
    except Exception as e:
        print(f"⚠️  Warning: Could not load dataset: {e}")
        print("   The app will start but endpoints may fail until the dataset is available.")
    
    print("=" * 60)


# Include routers
app.include_router(dashboard.router)
app.include_router(resume.router)
app.include_router(interview.router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "CareerInsights API"}
