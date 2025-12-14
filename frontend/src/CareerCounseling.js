import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';
import IntakeForm from './components/IntakeForm';
import CounselorStyleSelection from './components/CounselorStyleSelection';
import Stage1Questions from './components/Stage1Questions';
import Stage2Questions from './components/Stage2Questions';
import Results from './components/Results';
import LearningPathway from './components/LearningPathway';
import axios from 'axios';
import './App.css';

// Configure axios base URL for backend API
axios.defaults.baseURL = 'http://localhost:8000';

const CareerCounseling = () => {
  // Always start fresh - clear any old session data
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState('intake');
  const [isInitialized, setIsInitialized] = useState(false);

  // Clear old session data on mount
  useEffect(() => {
    // Clear any old session data from localStorage
    localStorage.removeItem('careerSessionId');
    localStorage.removeItem('careerStep');
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('careerSessionId', sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (currentStep) {
      localStorage.setItem('careerStep', currentStep);
    }
  }, [currentStep]);

  const handleIntakeComplete = (id) => {
    setSessionId(id);
    setCurrentStep('style');
  };

  const handleStyleComplete = () => {
    setCurrentStep('stage1');
  };

  const handleStage1Complete = () => {
    setCurrentStep('stage2');
  };

  const handleStage2Complete = () => {
    setCurrentStep('results');
  };

  const handleViewPathway = () => {
    setCurrentStep('pathway');
  };

  const handleStartOver = () => {
    localStorage.removeItem('careerSessionId');
    localStorage.removeItem('careerStep');
    setSessionId(null);
    setCurrentStep('intake');
  };

  // Navigation function that maps paths to steps
  const navigate = (path) => {
    const pathMap = {
      '/style': 'style',
      '/stage1': 'stage1',
      '/stage2': 'stage2',
      '/results': 'results',
      '/pathway': 'pathway'
    };
    const step = pathMap[path] || path;
    setCurrentStep(step);
  };

  // Don't render until initialized to avoid flash of wrong content
  if (!isInitialized) {
    return (
      <div className="ci-container">
        <NavBar />
        <main className="ci-main" style={{ minHeight: 'calc(100vh - 80px)', background: 'linear-gradient(135deg, #0b2c6d 0%, #1155c4 45%, #1e9ff5 100%)' }}>
          <div style={{ 
            minHeight: '100%', 
            background: 'linear-gradient(to bottom, rgba(11, 44, 109, 0.95), rgba(17, 85, 196, 0.95))',
            padding: '20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ color: '#e5e7eb', fontSize: '1.2rem' }}>Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ci-container">
      <NavBar />
      <main className="ci-main" style={{ minHeight: 'calc(100vh - 80px)', background: 'linear-gradient(135deg, #0b2c6d 0%, #1155c4 45%, #1e9ff5 100%)' }}>
        <div style={{ 
          minHeight: '100%', 
          background: 'linear-gradient(to bottom, rgba(11, 44, 109, 0.95), rgba(17, 85, 196, 0.95))',
          padding: '20px 0'
        }}>
          {(!sessionId || currentStep === 'intake') && (
            <IntakeForm onComplete={handleIntakeComplete} navigate={navigate} />
          )}
          {currentStep === 'style' && sessionId && (
            <CounselorStyleSelection
              sessionId={sessionId}
              onComplete={handleStyleComplete}
              navigate={navigate}
            />
          )}
          {currentStep === 'stage1' && sessionId && (
            <Stage1Questions
              sessionId={sessionId}
              onComplete={handleStage1Complete}
              navigate={navigate}
            />
          )}
          {currentStep === 'stage2' && sessionId && (
            <Stage2Questions
              sessionId={sessionId}
              onComplete={handleStage2Complete}
              navigate={navigate}
            />
          )}
          {currentStep === 'results' && sessionId && (
            <Results
              sessionId={sessionId}
              navigate={navigate}
            />
          )}
          {currentStep === 'pathway' && sessionId && (
            <LearningPathway sessionId={sessionId} onStartOver={handleStartOver} />
          )}
        </div>
      </main>
    </div>
  );
};

export default CareerCounseling;
