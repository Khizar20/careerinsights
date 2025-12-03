# Career Counseling Frontend

React frontend for the RAG-Powered Career Counseling System.

## Features

- **FE6: Multiple Counselor Styles** - Choose from friendly, professional, warm, or reflective interaction styles
- **FE1: Customized Learning Roadmaps** - Generated based on predicted career
- **FE2: Course & Certification Recommendations** - Online courses, certifications, and skill resources
- **FE3: Progress Tracking** - Mark completed courses, certifications, skills, and milestones
- **FE4: Adaptive Recommendations** - Based on user performance and interests

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start development server:
```bash
npm run dev
```

The frontend will run on http://localhost:3000

## Features Implementation

### Counselor Styles (FE6)
- Interactive style selection before questionnaire
- Styles persist throughout the session
- Affects report generation tone

### Learning Pathway (Module 3)
- **FE1**: Customized roadmaps with phases (Foundation, Intermediate, Advanced)
- **FE2**: Course recommendations from Coursera, Udemy, edX
- **FE3**: Progress tracking with checkboxes and completion status
- **FE4**: Adaptive recommendations based on progress percentage

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000` via proxy configuration in `vite.config.js`.

