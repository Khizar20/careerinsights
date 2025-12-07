import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import LandingPage from './LandingPage';
import DashboardPage from './DashboardPage';
import ResumeAnalyzer from './ResumeAnalyzer';
import InterviewPrep from './InterviewPrep';

function LandingWithNav() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // If user is already logged in, redirect to resume analyzer
  if (currentUser) {
    return <Navigate to="/resume-analyzer" replace />;
  }
  
  const goToResumeAnalyzer = () => navigate('/resume-analyzer'); 
  return <LandingPage onGoToDashboard={goToResumeAnalyzer} />;
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingWithNav />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resume-analyzer" 
            element={
              <ProtectedRoute>
                <ResumeAnalyzer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/interview-prep" 
            element={
              <ProtectedRoute>
                <InterviewPrep />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
