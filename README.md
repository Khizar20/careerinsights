# RAG-Powered Career Counseling System

A full-stack RAG-powered Career Prediction Engine with Personalized Learning Pathway system. Features a React frontend and FastAPI backend using Mistral LLM, SentenceTransformer embeddings, and FAISS vector store for intelligent career recommendations.

## Features

### Career Prediction Engine
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

### Personalized Learning Pathway
- **Customized Learning Roadmaps**: Generated based on predicted career
- **Course Recommendations**: Coursera, Udemy, edX suggestions
- **Progress Tracking**: Track completed courses, certifications, skills, milestones
- **Adaptive Recommendations**: Based on progress and performance

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Set Up API Key

Create a `.env` file in the project root:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

Get your API key from: https://mistral.ai

### 3. Start the System

**You need TWO terminals running:**

**Terminal 1 - Backend:**
```bash
python api/main.py
```
Wait for: `Uvicorn running on http://0.0.0.0:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Wait for: `Local: http://localhost:3000/`

### 4. Access the Application

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 5. Run Evaluation (Optional)

To test on ground truth data and generate BERTScore:
```bash
python run_evaluation.py
```

## Project Structure

```
.
├── api/
│   └── main.py              # FastAPI backend server
├── app/
│   ├── embeddings.py        # SentenceTransformer embeddings
│   ├── vectorstore.py        # FAISS vector store
│   ├── rag_pipeline.py      # RAG pipeline orchestration
│   ├── questionnaire_engine.py  # Questionnaire management
│   ├── mistral_predictor.py     # Mistral LLM predictions
│   ├── report_generator.py      # Career report generation
│   ├── learning_pathway.py      # Learning pathway management
│   └── session_manager.py       # Session data management
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   └── App.jsx
│   └── package.json
├── kb/                      # Knowledge base
│   ├── domains/             # Career domain files
│   └── careers/             # Career-specific files
├── questionnaire/           # Questionnaire files
├── data/                    # Generated data (FAISS index, sessions)
├── requirements.txt
└── README.md
```

## Usage

### Frontend Workflow

1. **Intake Form**: Enter your profile (name, age, education, interests, skills)
2. **Counselor Style Selection**: Choose your preferred interaction style
3. **Stage 1 Questions**: Answer 15 general questions
4. **Stage 2 Questions**: Answer 15 domain-specific questions
5. **Results**: View your career prediction and personalized report
6. **Learning Pathway**: Explore your customized learning roadmap

### API Endpoints

- `POST /api/session/create` - Create new session
- `GET /api/questions/stage1` - Get Stage 1 questions
- `POST /api/session/{id}/stage1` - Submit Stage 1 answers
- `GET /api/questions/stage2/{domain}` - Get Stage 2 questions
- `POST /api/session/{id}/stage2` - Submit Stage 2 answers
- `GET /api/session/{id}` - Get session results
- `GET /api/session/{id}/progress` - Get learning pathway progress
- `POST /api/session/{id}/progress/update` - Update progress

## Counselor Styles

- **Friendly**: Warm, encouraging, conversational
- **Professional**: Formal, structured, business-like
- **Warm**: Empathetic, supportive, nurturing
- **Reflective**: Thoughtful, introspective, insightful

## Career Domains

- Computer Technology
- Medical
- Business
- Engineering
- Arts
- Sports

## Requirements

- Python 3.8+
- Node.js 16+
- Mistral API key

## Troubleshooting

1. **Mistral API Key Error**: Ensure `MISTRAL_API_KEY` is set in `.env` file
2. **FAISS Index Not Found**: Index will be built automatically on first run
3. **Port Conflicts**: Change ports in `api/main.py` (backend) or `frontend/vite.config.js` (frontend)
4. **Module Not Found**: Run `pip install -r requirements.txt` and `npm install` in frontend

## License

This project is provided as-is for educational and development purposes.
