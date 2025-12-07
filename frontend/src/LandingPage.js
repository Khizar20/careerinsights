import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './AuthContext';

function LandingPage({ onGoToDashboard }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const { login, signup, resetPassword, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      
      // Navigate to resume analyzer after successful login/signup
      navigate('/resume-analyzer');
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await resetPassword(resetEmail);
      setError('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell app-root">
      <nav className="ci-navbar">
        <div className="ci-navbar-left">
          <div className="ci-logo">
            Career<span>Insights</span>
          </div>
          <div className="ci-nav-links">
            <span className="ci-nav-link">Jobs</span>
            <span className="ci-nav-link">Recruiters</span>
            <span className="ci-nav-link">Companies</span>
            <span className="ci-nav-link">Tools</span>
            <span className="ci-nav-link">Services</span>
            <span className="ci-nav-link">More</span>
          </div>
        </div>
        <div className="ci-navbar-right">
          <span>For Employers</span>
          <button className="ci-login-btn" onClick={() => setIsSignUp(true)}>
            Get Started
          </button>
        </div>
      </nav>

      <main className="ci-hero">
        <section className="ci-hero-card">
          <div className="ci-hero-left">
            <h1 className="ci-hero-title">
              {isSignUp ? 'Create Your Account' : 'Hello! Welcome Back'}
            </h1>
            <p className="ci-hero-subtitle">
              {isSignUp 
                ? 'Sign up to explore real-time labor market insights tailored to your career goals.'
                : 'Sign in to explore real-time labor market insights tailored to your career goals.'
              }
            </p>

            {error && (
              <div style={{
                padding: '12px',
                marginBottom: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword}>
                <div className="ci-form-group">
                  <label className="ci-label" htmlFor="reset-email">
                    Email address *
                  </label>
                  <input
                    className="ci-input"
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="ci-primary-btn"
                  disabled={loading}
                  style={{ marginBottom: '16px' }}
                >
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                  }}
                  className="ci-link"
                  style={{ display: 'block', textAlign: 'center' }}
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="ci-form-group">
                  <label className="ci-label" htmlFor="email">
                    Email address *
                  </label>
                  <input
                    className="ci-input"
                    id="email"
                    type="email"
                    placeholder="Enter email id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="ci-form-group">
                  <label className="ci-label" htmlFor="password">
                    Password *
                  </label>
                  <input
                    className="ci-input"
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {!isSignUp && (
                  <div className="ci-form-row">
                    <label className="ci-checkbox-row">
                      <input 
                        type="checkbox" 
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                      /> 
                      Keep me signed in on this device
                    </label>
                    <span 
                      className="ci-link" 
                      onClick={() => setShowForgotPassword(true)}
                      style={{ cursor: 'pointer' }}
                    >
                      Forgot Password
                    </span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="ci-primary-btn"
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </button>

                <div style={{ 
                  margin: '24px 0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px' 
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#1f2937' }}></div>
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: '#1f2937' }}></div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setError('');
                      setLoading(true);
                      await loginWithGoogle();
                      navigate('/resume-analyzer');
                    } catch (err) {
                      setError(err.message || 'Failed to sign in with Google');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '1px solid #1f2937',
                    background: '#020617',
                    color: '#e5e7eb',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = '#1f2937';
                      e.target.style.borderColor = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.background = '#020617';
                      e.target.style.borderColor = '#1f2937';
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {loading ? 'Please wait...' : 'Continue with Google'}
                </button>

                <div className="ci-form-footer">
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <span 
                        className="ci-link" 
                        onClick={() => {
                          setIsSignUp(false);
                          setError('');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        Sign In
                      </span>
                    </>
                  ) : (
                    <>
                      Not SignUp?{' '}
                      <span 
                        className="ci-link" 
                        onClick={() => {
                          setIsSignUp(true);
                          setError('');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        Create an account free
                      </span>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>

          <div className="ci-hero-right">
            <h2 className="ci-hero-right-title">
              Save time and effort with Quick Insights
            </h2>
            <p className="ci-hero-right-subtitle">
              Register free &amp; start exploring real-time labor market trends,
              in-demand skills, and salary insights across thousands of career
              paths.
            </p>

            <div className="ci-illustration">
              Visualize your career journey with live market data
            </div>

            <div className="ci-hero-metrics">
              <div className="ci-metric-pill">Live job openings</div>
              <div className="ci-metric-pill">Skill demand trends</div>
              <div className="ci-metric-pill">Salary benchmarks</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;


