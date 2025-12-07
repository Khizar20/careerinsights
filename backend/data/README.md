# Dataset Directory

Place your Kaggle AI Job Market dataset CSV file here.

## Instructions

1. Download the dataset from: https://www.kaggle.com/datasets/bismasajjad/global-ai-job-market-and-salary-trends-2025
2. Extract the CSV file (usually named something like `ai_jobs.csv` or `global_ai_job_market.csv`)
3. Place the CSV file in this `backend/data/` directory
4. Restart your FastAPI backend server

## Supported Column Names

The backend will automatically detect common column name variations:

- **Job Title**: `job_title`, `title`, `role`, `position`, `job`
- **Location**: `location`, `region`, `country`, `city`, `location_name`
- **Salary**: `salary`, `salary_usd`, `compensation`, `pay`, `salary_in_usd`
- **Skills**: `skills`, `required_skills`, `tags`, `technologies`, `skill`
- **Experience**: `experience_level`, `level`, `seniority`, `experience`, `exp_level`
- **Industry**: `industry`, `sector`, `domain`, `field`
- **Date**: `posted_date`, `date`, `timestamp`, `created_at`, `posting_date`

The backend will work with any combination of these column names.

