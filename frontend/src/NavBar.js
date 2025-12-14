import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './App.css';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <nav className="ci-navbar">
      <div className="ci-navbar-left">
        <div className="ci-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          Career<span>Insights</span>
        </div>
        <div className="ci-nav-links">
          <span 
            className={`ci-nav-link ${isActive('/dashboard') ? 'ci-nav-link-active' : ''}`}
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
          >
            Dashboard
          </span>
          <span 
            className={`ci-nav-link ${isActive('/resume-analyzer') ? 'ci-nav-link-active' : ''}`}
            onClick={() => navigate('/resume-analyzer')}
            style={{ cursor: 'pointer' }}
          >
            Resume Analyzer
          </span>
          <span 
            className={`ci-nav-link ${isActive('/interview-prep') ? 'ci-nav-link-active' : ''}`}
            onClick={() => navigate('/interview-prep')}
            style={{ cursor: 'pointer' }}
          >
            Interview Prep
          </span>
          <span 
            className={`ci-nav-link ${isActive('/career-counseling') ? 'ci-nav-link-active' : ''}`}
            onClick={() => navigate('/career-counseling')}
            style={{ cursor: 'pointer' }}
          >
            Career Counseling
          </span>
        </div>
      </div>
      <div className="ci-navbar-right">
        {/* User email and logout button */}
        {currentUser && (
          <span style={{ marginRight: '16px', color: '#9ca3af', fontSize: '0.9rem' }}>
            {currentUser.email}
          </span>
        )}
        <button className="ci-login-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default NavBar;

