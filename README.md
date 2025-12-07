## CareerInsights

React + FastAPI application for real-time labor market insights, powered by Kaggle AI job market dataset.

### Features

- **FE1**: Display real-time labor market trends, in-demand skills, and salary insights for various career paths
- **FE2**: Visualize job openings and growth projections through interactive graphs and charts
- **FE3**: Filter job insights by region, industry, and experience level
- **FE4**: Dataset-driven insights from Kaggle AI Job Market dataset

### Frontend (React)

- `cd frontend`
- `npm install` (if first time)
- `npm start` to run the SPA on `http://localhost:3000`

The app includes:
- Landing page with CareerInsights branding
- Dashboard with interactive charts, filters, and real-time insights

### Backend (Python / FastAPI)

**Setup:**

1. Create and activate a virtualenv (recommended)
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. **Configure SerpAPI (for Google Jobs API):**
   - Sign up for a free account at https://serpapi.com/
   - Get your API key from the dashboard
   - Create a `.env` file in the `backend/` directory:
   ```bash
   SERPAPI_KEY=your_serpapi_key_here
   ```

4. **Download the Kaggle dataset (optional, for trends/insights):**
   - Visit: https://www.kaggle.com/datasets/bismasajjad/global-ai-job-market-and-salary-trends-2025
   - Download and extract the CSV file
   - Place it in `backend/data/` directory

5. Run the API:

```bash
uvicorn backend.main:app --reload
```

The API exposes:

- `GET /health` – health check with dataset status
- `GET /api/trends?region=...&industry=...&experience=...` – labor market trends and salary insights (from Kaggle dataset)
- `GET /api/jobs?region=...&industry=...&experience=...` – job openings and growth projections (from Kaggle dataset)
- `GET /api/job-postings?q=...&region=...&limit=...&next_page_token=...` – real-time job postings from Google Jobs API

**Job Postings Endpoint Parameters:**
- `q` (optional): Search query (job title, keywords). If not provided, will be constructed from industry/experience.
- `region` (optional): Geographic location for the search (e.g., "New York, NY", "San Francisco, CA")
- `industry` (optional): Industry filter (used to construct query if `q` is not provided)
- `experience` (optional): Experience level (used to construct query if `q` is not provided)
- `limit` (optional, default: 20): Maximum number of results to return
- `next_page_token` (optional): Token for pagination to get next page of results

The job postings endpoint uses the Google Jobs API via SerpAPI to fetch real-time job listings. Other endpoints use the Kaggle dataset for historical insights and trends.


