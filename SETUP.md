# CareerInsights Setup Guide

## Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB (local or Atlas)
- Firebase account
- SerpAPI key (for job postings)
- Google Gemini API key (for interview features)

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the `backend` directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your API keys:
   - `SERPAPI_KEY` - Get from https://serpapi.com/
   - `GEMINI_API_KEY` - Get from https://ai.google.dev/
   - `MONGODB_URI` - Your MongoDB connection string
   - `MONGODB_DB_NAME` - Database name (default: careerinsights)

6. Place your dataset CSV file in `backend/data/` directory

7. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `src/firebase.js` file (copy from `firebase.js.example`):
   ```bash
   cp src/firebase.js.example src/firebase.js
   ```
   Then edit `firebase.js` and add your Firebase configuration from Firebase Console.

4. (Optional) Create a `.env` file if using environment variables for Firebase:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Firebase configuration.

5. Start the frontend development server:
   ```bash
   npm start
   ```

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
   - Enable "Google" (optional)
4. Get your Firebase configuration:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the configuration values
5. Add the configuration to `frontend/src/firebase.js`

## MongoDB Setup

### Local MongoDB:
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/`

### MongoDB Atlas (Cloud):
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string from "Connect" → "Connect your application"
4. Update `MONGODB_URI` in backend `.env`

## Running the Application

1. Start MongoDB (if using local)
2. Start backend server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```
3. Start frontend server:
   ```bash
   cd frontend
   npm start
   ```
4. Open browser to `http://localhost:3000`

## Project Structure

```
careerinsights/
├── backend/
│   ├── data/              # Dataset CSV files
│   ├── routers/           # API route handlers
│   ├── main.py           # FastAPI application
│   ├── requirements.txt  # Python dependencies
│   └── .env              # Environment variables (not in repo)
├── frontend/
│   ├── src/
│   │   ├── firebase.js   # Firebase config (not in repo)
│   │   └── ...           # React components
│   ├── package.json      # Node dependencies
│   └── .env              # Environment variables (not in repo)
└── README.md
```

## Important Notes

- Never commit `.env` files or `firebase.js` to version control
- The `.gitignore` file is configured to exclude sensitive files
- Use `.example` files as templates for configuration
- Make sure MongoDB is running before starting the backend
- Firebase Authentication must be enabled before using the app

