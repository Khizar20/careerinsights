# Quick Start Guide - CareerInsights

## Prerequisites Check ✅
- Python 3.13.1 ✅
- Node.js v22.13.1 ✅

---

## 🚀 Quick Start (Windows PowerShell)

### Step 1: Backend Setup

**Open Terminal 1 (PowerShell):**

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env file (use Notepad or VS Code)
# Copy .env.example to .env and add your API keys

# Start backend server
uvicorn main:app --reload --port 8000
```

**Expected Output:**
```
✅ SERPAPI_KEY loaded
✅ GEMINI_API_KEY loaded
✅ MONGODB_URI configured
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Keep this terminal open!**

---

### Step 2: Frontend Setup

**Open Terminal 2 (New PowerShell Window):**

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure Firebase (copy firebase.js.example to firebase.js and add your config)

# Start frontend server
npm start
```

**Expected Output:**
```
Compiled successfully!
Local: http://localhost:3000
```

**Keep this terminal open!**

---

### Step 3: Access Application

1. Open browser: **http://localhost:3000**
2. Sign up / Login with Firebase
3. Explore features:
   - Dashboard
   - Resume Analyzer
   - Interview Prep
   - Career Counseling

---

## 📝 Required Setup Files

### 1. Backend `.env` file (`backend/.env`):
```env
SERPAPI_KEY=your_key_here
GEMINI_API_KEY=your_key_here
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=careerinsights
MISTRAL_API_KEY=your_key_here
```

### 2. Frontend Firebase Config (`frontend/src/firebase.js`):
```javascript
const firebaseConfig = {
  apiKey: "your_api_key",
  authDomain: "your_auth_domain",
  projectId: "your_project_id",
  // ... rest of config
};
```

---

## 🔧 Troubleshooting

**Backend won't start:**
- Check if port 8000 is free: `netstat -ano | findstr :8000`
- Verify `.env` file exists in `backend/` folder
- Make sure virtual environment is activated

**Frontend won't start:**
- Check if port 3000 is free
- Run `npm install` again if dependencies fail
- Verify `firebase.js` is configured

**MongoDB connection error:**
- Install MongoDB locally OR
- Use MongoDB Atlas (update `MONGODB_URI` in `.env`)

---

## 📚 Full Documentation

See `HOW_TO_RUN.md` for detailed setup instructions.

