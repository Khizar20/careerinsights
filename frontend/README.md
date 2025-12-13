# CareerInsights Frontend

React frontend for the comprehensive CareerInsights platform, featuring labor market insights, resume analysis, interview preparation, and career counseling.

## Features

### Labor Market Dashboard
- Real-time job market trends and insights
- Interactive charts and visualizations
- Filter by region, industry, and experience level
- Job postings from Google Jobs API

### Resume Analyzer
- Upload and analyze resumes (PDF/DOCX)
- ATS compatibility scoring
- Keyword and skill analysis
- Job description matching
- Improvement recommendations

### Interview Preparation
- AI-powered question generation
- Adaptive difficulty system
- Real-time answer evaluation
- Progress tracking and analytics
- PDF performance reports
- Original vs. AI-enhanced answer comparison

### Career Counseling (RAG Module)
- Multiple counselor styles (friendly, professional, warm, reflective)
- Two-stage adaptive questionnaire
- Personalized career predictions
- Customized learning roadmaps
- Course & certification recommendations
- Progress tracking

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure Firebase:
- Copy `firebase.js.example` to `firebase.js`
- Add your Firebase project configuration

3. Start development server:
```bash
npm start
```

The frontend will run on http://localhost:3000

## Available Scripts

### `npm start`
Runs the app in development mode at http://localhost:3000

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
**Note: this is a one-way operation. Once you `eject`, you can't go back!**

## Project Structure

```
frontend/
├── src/
│   ├── App.js              # Main app component with routing
│   ├── AuthContext.js      # Firebase authentication context
│   ├── LandingPage.js     # Landing page with login/signup
│   ├── DashboardPage.js   # Labor market dashboard
│   ├── ResumeAnalyzer.js  # Resume analysis interface
│   ├── InterviewPrep.js   # Interview preparation module
│   ├── NavBar.js          # Navigation component
│   ├── firebase.js        # Firebase configuration
│   └── App.css            # Global styles
├── public/
└── package.json
```

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000`. All API calls are made from the React components using `fetch`.

## Authentication

Firebase Authentication is used for:
- Email/Password login and signup
- Google Sign-in
- Password reset
- Protected routes

## Learn More

- [React Documentation](https://reactjs.org/)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
