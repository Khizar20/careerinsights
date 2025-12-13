# CareerInsights - Comprehensive Career Development Platform

A full-stack career development platform combining real-time labor market insights, AI-powered resume analysis, interview preparation, and RAG-powered career counseling.

## Features

### Module 1: Real-Time Labor Market Dashboard
- **FE1**: Display real-time labor market trends, in-demand skills, and salary insights for various career paths
- **FE2**: Visualize job openings and growth projections through interactive graphs and charts
- **FE3**: Filter job insights by region, industry, and experience level
- **FE4**: Dataset-driven insights from Kaggle AI Job Market dataset

### Module 5: Smart Interview Preparation and Evaluation
- **FE1**: Generate AI-powered interview questions (technical, behavioral, and career-specific) using the Gemini API
- **FE2**: Implement an adaptive difficulty system that adjusts question complexity based on user performance
- **FE3**: Use AI-based evaluation to score user responses and provide improvement feedback
- **FE4**: Offer an interactive assistant for real-time guidance and role-specific interview tips
- **FE5**: Include a time-managed practice mode with a countdown timer per question
- **FE6**: Track user progress and visualize performance trends through analytics dashboards
- **FE7**: Generate a detailed performance report in PDF format summarizing interview results and recommendations
- **FE8**: Provide career-specific interview preparation tips and improvement suggestions
- **FE9**: Allow users to compare original vs. AI-enhanced responses to learn from improvements

### Module 6: AI-Powered Resume Analyzer
- **FE1**: Analyze uploaded resumes using Machine Learning models to generate a compatibility score
- **FE2**: Provide smart feedback on structure, keyword usage, and career relevance
- **FE3**: Match resumes against job descriptions to identify gaps and missing keywords
- **FE4**: Offer a user-friendly interface for easy resume upload and report viewing
- **FE5**: Use AI-driven analysis to suggest improvements in skill representation and formatting
- **FE6**: Generate a performance report summarizing analysis results, strengths, and optimization suggestions

### Module 2: RAG-Powered Career Counseling System
- **User Profile Collection**: Collects user interests, education, and skills
- **Two-Stage Adaptive Questionnaire**:  
  - Stage 1: 15 general questions to predict career domain  
  - Stage 2: 15 domain-specific questions to identify specific career
- **Mistral LLM Predictions**:  
  - Primary career domain with reasoning  
  - Specific career role  
  - Confidence indicators (realistic 50-90%)
- **Personalized Reports**: Natural, conversational reports with multiple counselor styles (friendly, professional, warm, reflective)
- **Session Management**: Complete session data storage

### Module 3: Personalized Learning Pathway
- **Customized Learning Roadmaps**: Generated based on predicted career
- **Course Recommendations**: Coursera, Udemy, edX suggestions
- **Progress Tracking**: Track completed courses, certifications, skills, milestones
- **Adaptive Recommendations**: Based on progress and performance

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
pip install -r backend/requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Set Up API Keys

Create a `.env` file in the `backend/` directory:

```env
# SerpAPI Key for Google Jobs API integration
SERPAPI_KEY=your_serpapi_key_here

# Google Gemini API Key for AI features in Interview Prep
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Connection URI for Interview Prep session persistence
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=careerinsights

# Mistral API Key for Career Counseling (RAG module)
MISTRAL_API_KEY=your_mistral_api_key_here
```

Get your API keys from:
- SerpAPI: https://serpapi.com/
- Gemini: https://ai.google.dev/
- Mistral: https://mistral.ai/

### 3. Download the Kaggle Dataset (Optional)

For labor market trends and insights:
- Visit: https://www.kaggle.com/datasets/bismasajjad/global-ai-job-market-and-salary-trends-2025
- Download and extract the CSV file
- Place it in `backend/data/` directory

### 4. Set Up Firebase Authentication

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Email/Password and Google Sign-in authentication
3. Copy your Firebase config to `frontend/src/firebase.js` (see `firebase.js.example` for template)

### 5. Start the System

**You need TWO terminals running:**

**Terminal 1 - Backend:**
```bash
uvicorn backend.main:app --reload
```
Wait for: `Uvicorn running on http://0.0.0.0:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
Wait for: `Local: http://localhost:3000/`

### 6. Access the Application

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI backend server
│   ├── routers/             # Modular API routers
│   │   ├── dashboard.py     # Labor market trends & job postings
│   │   ├── resume.py        # Resume analyzer endpoints
│   │   └── interview.py     # Interview prep endpoints
│   ├── data/                # Kaggle dataset (CSV files)
│   └── requirements.txt
├── frontend/                # React frontend
│   ├── src/
│   │   ├── DashboardPage.js      # Labor market dashboard
│   │   ├── ResumeAnalyzer.js     # Resume analysis interface
│   │   ├── InterviewPrep.js      # Interview preparation module
│   │   ├── LandingPage.js        # Authentication & landing
│   │   ├── AuthContext.js        # Firebase auth context
│   │   └── firebase.js           # Firebase configuration
│   └── package.json
├── api/                     # RAG Career Counseling backend (legacy)
│   └── main.py
├── app/                     # RAG Career Counseling modules
│   ├── embeddings.py
│   ├── vectorstore.py
│   ├── rag_pipeline.py
│   └── ...
├── kb/                      # Knowledge base for RAG
│   ├── domains/
│   └── careers/
├── questionnaire/           # Questionnaire files
└── README.md
```

## API Endpoints

### Dashboard & Job Market
- `GET /api/trends?region=...&industry=...&experience=...` – labor market trends and salary insights
- `GET /api/jobs?region=...&industry=...&experience=...` – job openings and growth projections
- `GET /api/job-postings?q=...&region=...&limit=...` – real-time job postings from Google Jobs API

### Resume Analyzer
- `POST /api/analyze-resume` – Upload and analyze resume (PDF/DOCX)

### Interview Preparation
- `POST /api/interview/create-session` – Create new practice session
- `POST /api/interview/submit-answer` – Submit answer for evaluation
- `GET /api/interview/progress/{job_title}` – Get progress analytics
- `GET /api/interview/generate-report/{session_id}` – Generate PDF report

### Career Counseling (RAG Module)
- `POST /api/session/create` – Create new session
- `GET /api/questions/stage1` – Get Stage 1 questions
- `POST /api/session/{id}/stage1` – Submit Stage 1 answers
- `GET /api/questions/stage2/{domain}` – Get Stage 2 questions
- `POST /api/session/{id}/stage2` – Submit Stage 2 answers
- `GET /api/session/{id}` – Get session results

## Requirements

- Python 3.8+
- Node.js 16+
- MongoDB (for interview session persistence)
- API Keys: SerpAPI, Gemini, Mistral (optional for RAG module)
- Firebase project (for authentication)

## Troubleshooting

1. **API Key Errors**: Ensure all required API keys are set in `backend/.env`
2. **MongoDB Connection**: Ensure MongoDB is running or update `MONGODB_URI` for Atlas
3. **Firebase Auth**: Check `firebase.js` configuration matches your Firebase project
4. **Port Conflicts**: Change ports in backend (`uvicorn`) or frontend (`package.json`)
5. **Module Not Found**: Run `pip install -r backend/requirements.txt` and `npm install` in frontend

## License

This project is provided as-is for educational and development purposes.
