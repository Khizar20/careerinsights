import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import IntakeForm from './components/IntakeForm'
import CounselorStyleSelection from './components/CounselorStyleSelection'
import Stage1Questions from './components/Stage1Questions'
import Stage2Questions from './components/Stage2Questions'
import Results from './components/Results'
import LearningPathway from './components/LearningPathway'
import Header from './components/Header'

function App() {
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || null)
  const [currentStep, setCurrentStep] = useState('intake')

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId)
    }
  }, [sessionId])

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <Routes>
          <Route path="/" element={<IntakeForm onComplete={(id) => setSessionId(id)} />} />
          <Route path="/style" element={<CounselorStyleSelection sessionId={sessionId} onComplete={() => setCurrentStep('stage1')} />} />
          <Route path="/stage1" element={<Stage1Questions sessionId={sessionId} onComplete={() => setCurrentStep('stage2')} />} />
          <Route path="/stage2" element={<Stage2Questions sessionId={sessionId} onComplete={() => setCurrentStep('results')} />} />
          <Route path="/results" element={<Results sessionId={sessionId} />} />
          <Route path="/pathway" element={<LearningPathway sessionId={sessionId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
