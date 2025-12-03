# How to Run the Career Counseling System

## Quick Start Guide

### Step 1: Install Dependencies

**Backend Dependencies:**
```bash
pip install -r requirements.txt
```

**Frontend Dependencies:**
```bash
cd frontend
npm install
cd ..
```

### Step 2: Set Up API Key

Create a `.env` file in the project root:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

Get your API key from: https://mistral.ai

### Step 3: Start the System

You need **TWO terminals** running simultaneously:

#### Terminal 1 - Backend Server
```bash
python api/main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Terminal 2 - Frontend Server
```bash
cd frontend
npm run dev
```

You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:3000/
```

### Step 4: Access the Application

Open your browser and go to:
- **Frontend Application**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health Check**: http://localhost:8000/api/health

## Complete Workflow

1. **Open Frontend** → http://localhost:3000
2. **Fill Intake Form** → Enter your profile information
3. **Select Counselor Style** → Choose your preferred interaction style
4. **Answer Stage 1 Questions** → 15 general questions
5. **Answer Stage 2 Questions** → 15 domain-specific questions
6. **View Results** → See your career prediction and report
7. **Explore Learning Pathway** → Check your personalized roadmap

## Running Evaluation (Optional)

To test the system on ground truth data and generate BERTScore metrics:

```bash
python run_evaluation.py
```

This will:
- Test 8 ground truth samples
- Calculate prediction accuracy
- Generate BERTScore metrics
- Save results to `evaluation/evaluation_results.json`

## Troubleshooting

### Backend Won't Start
- Check if port 8000 is available
- Verify `.env` file has `MISTRAL_API_KEY`
- Make sure all Python dependencies are installed

### Frontend Won't Start
- Make sure you're in the `frontend` directory
- Run `npm install` if you haven't already
- Check if port 3000 is available

### API Connection Errors
- Ensure backend is running on port 8000
- Check browser console for errors
- Verify CORS is enabled in backend

### Module Not Found Errors
- Run `pip install -r requirements.txt` again
- Make sure you're in the project root directory
- Check Python version (requires 3.8+)

## Port Configuration

If ports 8000 or 3000 are busy:

**Backend (change in `api/main.py`):**
```python
port = int(os.getenv("PORT", 8001))  # Change 8000 to 8001
```

**Frontend (change in `frontend/vite.config.js`):**
```javascript
server: {
  port: 3001,  // Change 3000 to 3001
}
```

## System Requirements

- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **Mistral API Key**: Required for predictions
- **Internet**: Required for API calls and model downloads

## First Run Notes

- First run will build FAISS index (takes ~1-2 minutes)
- BERTScore will download model on first evaluation run (~400MB)
- SentenceTransformer downloads model on first use (~80MB)

## Stopping the System

Press `CTRL+C` in both terminals to stop the servers.

