import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import NavBar from './NavBar';

const InterviewPrep = () => {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [questionType, setQuestionType] = useState('technical');
  const [session, setSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [guidance, setGuidance] = useState(null);
  const [progress, setProgress] = useState(null);
  const [tips, setTips] = useState([]);
  const [numQuestions, setNumQuestions] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(300);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [showProgressAnalytics, setShowProgressAnalytics] = useState(false);
  const timerRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      handleSubmitAnswer();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerRunning, timeLeft]);

  // Load guidance when question changes
  useEffect(() => {
    if (session && session.questions && session.questions[currentQuestionIndex]) {
      loadGuidance();
    }
  }, [currentQuestionIndex, session, questionType, jobTitle]);

  // Load progress
  useEffect(() => {
    if (jobTitle || !session) {
      loadProgress();
      if (jobTitle) {
        loadTips();
      }
    }
  }, [jobTitle, session]);

  const loadGuidance = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/interview/assistant-guidance?job_title=${encodeURIComponent(jobTitle)}&question_type=${questionType}&current_question=${encodeURIComponent(session.questions[currentQuestionIndex]?.question || '')}`
      );
      const data = await response.json();
      setGuidance(data);
    } catch (error) {
      console.error('Error loading guidance:', error);
    }
  };

  const loadProgress = async (job = null) => {
    try {
      const jobToUse = job || jobTitle || 'Software Engineer';
      const response = await fetch(
        `http://localhost:8000/api/interview/progress/${encodeURIComponent(jobToUse)}`
      );
      const data = await response.json();
      setProgress(data);
      return data;
    } catch (error) {
      console.error('Error loading progress:', error);
      const emptyProgress = {
        total_sessions: 0,
        total_questions: 0,
        average_score: 0,
        current_difficulty: 'medium',
        session_history: [],
        recent_scores: [],
        scores_by_type: {}
      };
      setProgress(emptyProgress);
      return emptyProgress;
    }
  };

  const loadTips = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/interview/tips/${encodeURIComponent(jobTitle)}?question_type=${questionType}`
      );
      const data = await response.json();
      setTips(Array.isArray(data.tips) ? data.tips : [data.tips]);
    } catch (error) {
      console.error('Error loading tips:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    if (!jobTitle) {
      alert('Please enter a job title');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/interview/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_title: jobTitle,
          question_type: questionType,
          num_questions: numQuestions,
          time_per_question: timePerQuestion,
        }),
      });

      const data = await response.json();
      setSession(data.session);
      setCurrentQuestionIndex(0);
      setAnswer('');
      setTimeLeft(timePerQuestion);
      setIsTimerRunning(true);
      setEvaluation(null);
      setShowComparison(false);
      setShowSessionSetup(false);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session || !answer.trim()) {
      alert('Please provide an answer');
      return;
    }

    setIsTimerRunning(false);
    setLoading(true);

    const currentQuestion = session.questions[currentQuestionIndex];
    const timeTaken = timePerQuestion - timeLeft;

    try {
      const response = await fetch('http://localhost:8000/api/interview/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.session_id,
          question_id: currentQuestion.question_id,
          answer: answer,
          time_taken: timeTaken,
        }),
      });

      const data = await response.json();
      setEvaluation(data.evaluation);
      setShowComparison(true);

      const updatedSession = { ...session };
      updatedSession.answers = {
        ...updatedSession.answers,
        [currentQuestion.question_id]: {
          answer: answer,
          evaluation: data.evaluation,
        },
      };
      setSession(updatedSession);

      loadProgress();
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setAnswer('');
      setTimeLeft(timePerQuestion);
      setIsTimerRunning(true);
      setEvaluation(null);
      setShowComparison(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/interview/generate-report/${session.session_id}`
      );
      const data = await response.json();

      const binaryString = atob(data.pdf_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = session?.questions?.[currentQuestionIndex];
  const stats = progress || {
    total_sessions: 0,
    total_questions: 0,
    average_score: 0,
    current_difficulty: 'medium'
  };

  // Progress Analytics View
  if (showProgressAnalytics) {
    return (
      <div className="ci-container">
        <NavBar />
        <main className="ci-main">
          <header className="ci-header">
            <div className="ci-header-content">
              <button
                onClick={() => setShowProgressAnalytics(false)}
                style={{
                  marginBottom: '16px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #1f2937',
                  background: 'transparent',
                  color: '#9ca3af',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <h1 className="ci-title">
                Progress <span style={{ color: '#10b981' }}>Analytics</span>
              </h1>
              <p className="ci-subtitle">
                Comprehensive analysis of your interview preparation performance
              </p>
            </div>
          </header>

          <section className="ci-main-content-grid">
            {/* Overall Statistics */}
            <div className="ci-card">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '24px' }}>
                Overall Statistics
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(30, 159, 245, 0.1)', borderRadius: '8px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>Total Sessions</div>
                  <div style={{ color: '#1e9ff5', fontSize: '2rem', fontWeight: 700 }}>
                    {progress.total_sessions || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>Total Questions</div>
                  <div style={{ color: '#10b981', fontSize: '2rem', fontWeight: 700 }}>
                    {progress.total_questions || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>Average Score</div>
                  <div style={{ color: '#8b5cf6', fontSize: '2rem', fontWeight: 700 }}>
                    {progress.average_score || 0}/100
                  </div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '4px' }}>Current Difficulty</div>
                  <div style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: 700, textTransform: 'capitalize' }}>
                    {progress.current_difficulty || 'medium'}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance by Type */}
            {progress.scores_by_type && Object.keys(progress.scores_by_type).length > 0 && (
              <div className="ci-card">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '24px' }}>
                  Performance by Question Type
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(progress.scores_by_type).map(([type, score]) => (
                    <div key={type} style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#e5e7eb', textTransform: 'capitalize' }}>{type}</span>
                        <span style={{ color: '#1e9ff5', fontWeight: 600 }}>{score}/100</span>
                      </div>
                      <div style={{
                        marginTop: '8px',
                        width: '100%',
                        height: '6px',
                        background: 'rgba(31, 41, 55, 0.6)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${score}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #1e9ff5, #3b82f6)',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session History */}
            {progress.session_history && progress.session_history.length > 0 && (
              <div className="ci-card" style={{ gridColumn: '1 / -1' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '24px' }}>
                  Session History
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1f2937' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#9ca3af', fontSize: '0.9rem' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#9ca3af', fontSize: '0.9rem' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Questions</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Completion</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Score</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progress.session_history.map((session, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '12px', color: '#e5e7eb' }}>
                            {new Date(session.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px', color: '#e5e7eb', textTransform: 'capitalize' }}>
                            {session.question_type}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#e5e7eb' }}>
                            {session.questions_answered}/{session.total_questions}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#e5e7eb' }}>
                            {session.completion_rate}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#1e9ff5', fontWeight: 600 }}>
                            {session.average_score}/100
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: session.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: session.completed ? '#10b981' : '#f59e0b',
                              fontSize: '0.85rem',
                            }}>
                              {session.completed ? 'Completed' : 'In Progress'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Scores Trend */}
            {progress.recent_scores && progress.recent_scores.length > 0 && (
              <div className="ci-card" style={{ gridColumn: '1 / -1' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '24px' }}>
                  Recent Performance Trend
                </h2>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '16px' }}>
                  {progress.recent_scores.map((score, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '100%',
                        height: `${(score / 100) * 180}px`,
                        background: 'linear-gradient(180deg, #1e9ff5, #3b82f6)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: '4px',
                      }} />
                      <div style={{ marginTop: '8px', color: '#9ca3af', fontSize: '0.75rem' }}>
                        {score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!progress || progress.total_sessions === 0) && (
              <div className="ci-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                <h3 style={{ color: '#e5e7eb', marginBottom: '8px' }}>No Progress Data Yet</h3>
                <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
                  Start practicing interview questions to see your progress analytics here.
                </p>
                <button
                  onClick={() => setShowProgressAnalytics(false)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1e9ff5',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Start Practice Session
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // If in active session, show the practice interface
  if (session && currentQuestion && !evaluation) {
    return (
      <div className="ci-container">
        <NavBar />

        <main className="ci-main">
          <section className="ci-section">
            <div className="ci-card">
              {/* Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                    Question {currentQuestionIndex + 1} of {session.questions.length}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                    {Object.keys(session.answers || {}).length} answered
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(31, 41, 55, 0.6)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${((currentQuestionIndex + 1) / session.questions.length) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #1e9ff5, #3b82f6)',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>

              {/* Timer */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: timeLeft < 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(30, 159, 245, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                border: `2px solid ${timeLeft < 60 ? '#ef4444' : '#1e9ff5'}`,
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: timeLeft < 60 ? '#ef4444' : '#1e9ff5',
                }}>
                  {formatTime(timeLeft)}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>
                  {isTimerRunning ? 'Time Remaining' : 'Timer Stopped'}
                </div>
              </div>

              {/* Current Question */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '12px' }}>
                  {currentQuestion.question}
                </h3>
                {currentQuestion.tips && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    borderLeft: '3px solid #f59e0b',
                  }}>
                    <strong style={{ color: '#f59e0b' }}>Tip:</strong>{' '}
                    <span style={{ color: '#e5e7eb' }}>{currentQuestion.tips}</span>
                  </div>
                )}

                {guidance && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(30, 159, 245, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    borderLeft: '3px solid #1e9ff5',
                  }}>
                    <strong style={{ color: '#1e9ff5' }}>💡 Assistant Guidance:</strong>
                    <div style={{ color: '#e5e7eb', marginTop: '8px', whiteSpace: 'pre-line' }}>
                      {guidance.guidance}
                    </div>
                  </div>
                )}

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #1f2937',
                    background: '#020617',
                    color: '#e5e7eb',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={loading || !answer.trim() || !isTimerRunning}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: loading || !answer.trim() || !isTimerRunning ? '#6b7280' : '#10b981',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '1rem',
                      cursor: loading || !answer.trim() || !isTimerRunning ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Evaluating...' : 'Submit Answer'}
                  </button>
                  {!isTimerRunning && (
                    <button
                      onClick={() => setIsTimerRunning(true)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: '1px solid #1e9ff5',
                        background: 'transparent',
                        color: '#1e9ff5',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: 'pointer',
                      }}
                    >
                      Resume Timer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Show evaluation results
  if (evaluation) {
    return (
      <div className="ci-container">
        <NavBar />

        <main className="ci-main">
          <section className="ci-section">
            <div className="ci-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>
                Evaluation Results
              </h3>

              <div style={{
                textAlign: 'center',
                padding: '24px',
                background: `linear-gradient(135deg, ${evaluation.score >= 80 ? '#10b981' : evaluation.score >= 60 ? '#3b82f6' : '#f59e0b'}15, ${evaluation.score >= 80 ? '#10b981' : evaluation.score >= 60 ? '#3b82f6' : '#f59e0b'}05)`,
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 700,
                  color: evaluation.score >= 80 ? '#10b981' : evaluation.score >= 60 ? '#3b82f6' : '#f59e0b',
                }}>
                  {evaluation.score}/100
                </div>
              </div>

              {evaluation.score_breakdown && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ color: '#e5e7eb', marginBottom: '12px' }}>Score Breakdown</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {Object.entries(evaluation.score_breakdown).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '8px',
                      }}>
                        <div style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                          {key.replace('_', ' ')}
                        </div>
                        <div style={{ color: '#e5e7eb', fontSize: '1.2rem', fontWeight: 600 }}>
                          {value}/100
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: '#10b981', marginBottom: '8px' }}>✅ Strengths</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {evaluation.strengths.map((strength, idx) => (
                      <li key={idx} style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '4px',
                        color: '#e5e7eb',
                      }}>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.improvements && evaluation.improvements.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>💡 Areas for Improvement</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {evaluation.improvements.map((improvement, idx) => (
                      <li key={idx} style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '4px',
                        color: '#e5e7eb',
                      }}>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.feedback && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(30, 159, 245, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  color: '#e5e7eb',
                }}>
                  <strong style={{ color: '#1e9ff5' }}>Feedback:</strong>{' '}
                  {evaluation.feedback}
                </div>
              )}

              {showComparison && evaluation.comparison && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ color: '#e5e7eb', marginBottom: '12px' }}>
                    📊 Original vs. AI-Enhanced Answer
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '8px',
                    }}>
                      <h5 style={{ color: '#9ca3af', marginBottom: '8px' }}>Your Answer</h5>
                      <p style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                        {evaluation.comparison.original}
                      </p>
                    </div>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid #10b981',
                    }}>
                      <h5 style={{ color: '#10b981', marginBottom: '8px' }}>AI-Enhanced Answer</h5>
                      <p style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                        {evaluation.comparison.enhanced}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                {currentQuestionIndex < session.questions.length - 1 ? (
                  <button
                    onClick={() => {
                      setEvaluation(null);
                      setShowComparison(false);
                      handleNextQuestion();
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#1e9ff5',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '1rem',
                      cursor: 'pointer',
                    }}
                  >
                    Next Question
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleGenerateReport}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: loading ? '#6b7280' : '#ff8a00',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Generating...' : 'Generate PDF Report'}
                    </button>
                    <button
                      onClick={() => {
                        setSession(null);
                        setCurrentQuestionIndex(0);
                        setEvaluation(null);
                        setShowComparison(false);
                        setAnswer('');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: '1px solid #1e9ff5',
                        background: 'transparent',
                        color: '#1e9ff5',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: 'pointer',
                      }}
                    >
                      Start New Session
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="ci-container">
      <NavBar />

      <main className="ci-main">
        <section className="ci-section">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              color: '#ffffff',
              marginBottom: '12px'
            }}>
              Interview <span style={{ color: '#10b981' }}>Preparation</span>
            </h1>
            <p style={{ 
              fontSize: '1.1rem', 
              color: '#9ca3af',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Practice with AI-powered interview questions and get real-time feedback to ace your next interview
            </p>
          </div>

          {/* Metrics Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '20px',
            marginBottom: '40px'
          }}>
            <div style={{
              padding: '24px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(31, 41, 55, 0.6)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(30, 159, 245, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                📝
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e9ff5', marginBottom: '4px' }}>
                {stats.total_sessions || 0}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                Sessions Completed
              </div>
            </div>

            <div style={{
              padding: '24px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(31, 41, 55, 0.6)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                🎯
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                {stats.total_questions || 0}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                Questions Answered
              </div>
            </div>

            <div style={{
              padding: '24px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(31, 41, 55, 0.6)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                📚
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>
                {stats.average_score || 0}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                Average Score
              </div>
            </div>

            <div style={{
              padding: '24px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(31, 41, 55, 0.6)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                🏆
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px', textTransform: 'capitalize' }}>
                {stats.current_difficulty || 'Medium'}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                Current Difficulty
              </div>
            </div>
          </div>

          {/* Main Content Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px',
            marginBottom: '40px'
          }}>
            {/* Practice Session Card */}
            <div className="ci-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>
                  Interview Practice Session
                </h2>
                <span style={{ marginLeft: '8px', fontSize: '1.2rem' }}>ℹ️</span>
              </div>
              <p style={{ color: '#9ca3af', marginBottom: '24px', lineHeight: '1.6' }}>
                Take our comprehensive interview practice session with AI-powered questions. Get real-time feedback, 
                adaptive difficulty, and detailed evaluations to improve your interview skills.
              </p>
              
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>AI-powered question generation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>Real-time answer evaluation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>Adaptive difficulty system</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>Time-managed practice mode</span>
                </div>
              </div>

              {!showSessionSetup ? (
                <button
                  onClick={() => setShowSessionSetup(true)}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  Start New Practice Session →
                </button>
              ) : (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e5e7eb', fontWeight: 500 }}>
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g., Software Engineer, Data Scientist"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #1f2937',
                        background: '#020617',
                        color: '#e5e7eb',
                        fontSize: '1rem',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#e5e7eb', fontWeight: 500 }}>
                      Question Type
                    </label>
                    <select
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #1f2937',
                        background: '#020617',
                        color: '#e5e7eb',
                        fontSize: '1rem',
                      }}
                    >
                      <option value="technical">Technical</option>
                      <option value="behavioral">Behavioral</option>
                      <option value="career-specific">Career-Specific</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#e5e7eb', fontWeight: 500, fontSize: '0.9rem' }}>
                        Questions
                      </label>
                      <input
                        type="number"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                        min="1"
                        max="10"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #1f2937',
                          background: '#020617',
                          color: '#e5e7eb',
                          fontSize: '1rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#e5e7eb', fontWeight: 500, fontSize: '0.9rem' }}>
                        Time (sec)
                      </label>
                      <input
                        type="number"
                        value={timePerQuestion}
                        onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 300)}
                        min="60"
                        max="1800"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #1f2937',
                          background: '#020617',
                      color: '#e5e7eb',
                          fontSize: '1rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={startSession}
                      disabled={loading || !jobTitle}
                      style={{
                        flex: 1,
                        padding: '14px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: loading || !jobTitle ? '#6b7280' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: loading || !jobTitle ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Creating...' : 'Start Session →'}
                    </button>
                    <button
                      onClick={() => setShowSessionSetup(false)}
                      style={{
                        padding: '14px 24px',
                        borderRadius: '8px',
                        border: '1px solid #1f2937',
                        background: 'transparent',
                        color: '#9ca3af',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Analytics Card */}
            <div className="ci-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>
                  Performance Analytics
                </h2>
                <span style={{ marginLeft: '8px', fontSize: '1.2rem' }}>📊</span>
              </div>
              <p style={{ color: '#9ca3af', marginBottom: '24px', lineHeight: '1.6' }}>
                Track your interview preparation progress, view detailed analytics, and get personalized 
                recommendations to improve your performance.
              </p>
              
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>Progress tracking & trends</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>Score breakdown by type</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>PDF performance reports</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  <span style={{ color: '#e5e7eb' }}>Career-specific tips</span>
                </div>
              </div>

              {progress && progress.total_questions > 0 && (
                <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Average Score</div>
                      <div style={{ color: '#1e9ff5', fontSize: '1.5rem', fontWeight: 700 }}>
                        {progress.average_score}/100
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Total Sessions</div>
                      <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700 }}>
                        {progress.total_sessions}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '12px', fontWeight: 500 }}>
                  Popular Practice Areas:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {['Technical', 'Behavioral', 'System Design', 'Leadership', 'Problem Solving', 'Communication'].map((area) => (
                    <button
                      key={area}
                      onClick={() => {
                        setQuestionType(area.toLowerCase().replace(' ', '-'));
                        setShowSessionSetup(true);
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: '1px solid #1f2937',
                        background: 'rgba(15, 23, 42, 0.6)',
                        color: '#e5e7eb',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(30, 159, 245, 0.2)';
                        e.target.style.borderColor = '#1e9ff5';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(15, 23, 42, 0.6)';
                        e.target.style.borderColor = '#1f2937';
                      }}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  const jobToUse = jobTitle || 'Software Engineer';
                  await loadProgress(jobToUse);
                  setShowProgressAnalytics(true);
                }}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                View Progress Analytics →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default InterviewPrep;
