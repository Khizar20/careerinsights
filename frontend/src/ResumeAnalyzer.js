import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import NavBar from './NavBar';

const API_BASE = 'http://127.0.0.1:8000';

function ResumeAnalyzer() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'doc'].includes(fileExt)) {
        setError('Please upload a PDF or DOCX file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setAnalysis(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (jobDescription.trim()) {
        formData.append('job_description', jobDescription.trim());
      }

      const response = await fetch(`${API_BASE}/api/analyze-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze resume');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      // Store performance report for later use
      if (data.performance_report) {
        // Performance report is included in analysis
      }
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing your resume');
    } finally {
      setUploading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="app-shell dashboard-root">
      <NavBar />

      <main className="ci-dashboard">
        <header className="ci-dashboard-header">
          <div>
            <h1 className="ci-dashboard-title">Resume/CV Analyzer</h1>
            <p className="ci-dashboard-subtitle">
              Upload your resume to get an ATS (Applicant Tracking System) score and personalized recommendations
            </p>
          </div>
        </header>

        <section className="ci-resume-analyzer-section">
          <div className="ci-card">
            <h2 className="ci-card-title">Upload Your Resume</h2>
            <p className="ci-card-subtitle">
              Supported formats: PDF, DOCX, DOC (Max 10MB)
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#e5e7eb', fontWeight: 500 }}>
                Job Description (Optional)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here to get personalized matching analysis and identify missing keywords..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #1f2937',
                  background: '#020617',
                  color: '#e5e7eb',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <p style={{ marginTop: '4px', fontSize: '0.75rem', color: '#9ca3af' }}>
                Adding a job description enables keyword matching and gap analysis
              </p>
            </div>

            <div className="ci-upload-area">
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="resume-upload" className="ci-upload-label">
                <div className="ci-upload-icon">📄</div>
                <div className="ci-upload-text">
                  {file ? file.name : 'Click to select or drag and drop your resume'}
                </div>
                <div className="ci-upload-hint">PDF, DOCX, or DOC files only</div>
              </label>
            </div>

            {error && (
              <div className="ci-error-message" style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <button
              className="ci-analyze-btn"
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: uploading ? '#6b7280' : '#ff8a00',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: uploading || !file ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {uploading ? 'Analyzing...' : 'Analyze Resume'}
            </button>
          </div>

          {analysis && (
            <div className="ci-card" style={{ marginTop: '24px' }}>
              <h2 className="ci-card-title">ATS Analysis Results</h2>
              
              {/* Score Display */}
              <div className="ci-score-display" style={{
                textAlign: 'center',
                padding: '32px',
                background: `linear-gradient(135deg, ${analysis.category_color}15, ${analysis.category_color}05)`,
                borderRadius: '16px',
                marginBottom: '32px',
                border: `2px solid ${analysis.category_color}40`,
              }}>
                <div style={{ fontSize: '3rem', fontWeight: 700, color: analysis.category_color, marginBottom: '8px' }}>
                  {analysis.ats_score}/{analysis.max_score}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '8px' }}>
                  {analysis.category}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                  ATS Compatibility Score
                </div>
              </div>

              {/* Score Breakdown */}
              {analysis.scores_breakdown && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>
                    📊 Score Breakdown
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {Object.entries(analysis.scores_breakdown).map(([key, value]) => {
                      // Calculate max possible for this category based on weights
                      const maxScores = {
                        structure: 40,
                        formatting: 10,
                        keywords: 20,
                        action_verbs: 12,
                        quantifiable: 8,
                        skills: 10,
                      };
                      const maxForCategory = maxScores[key] || 100;
                      const percentage = maxForCategory > 0 ? (value / maxForCategory) * 100 : 0;
                      
                      return (
                        <div key={key} style={{
                          padding: '12px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: '8px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ color: '#9ca3af', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                              {key.replace('_', ' ')}
                            </span>
                            <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
                              {value.toFixed(1)}/{maxForCategory.toFixed(0)}
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(31, 41, 55, 0.6)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${analysis.category_color}, ${analysis.category_color}dd)`,
                              transition: 'width 0.5s',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Total Score Verification */}
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    background: 'rgba(30, 159, 245, 0.1)', 
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Total: </span>
                    <span style={{ color: '#1e9ff5', fontWeight: 600, fontSize: '1rem' }}>
                      {Object.values(analysis.scores_breakdown).reduce((sum, val) => sum + val, 0).toFixed(1)}/100
                    </span>
                  </div>
                </div>
              )}

              {/* Job Match Analysis */}
              {analysis.job_match && (
                <div style={{ marginBottom: '32px', padding: '20px', background: 'rgba(30, 159, 245, 0.1)', borderRadius: '12px', border: '1px solid rgba(30, 159, 245, 0.3)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '16px' }}>
                    🎯 Job Description Match
                  </h3>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#9ca3af' }}>Match Percentage</span>
                      <span style={{ color: '#1e9ff5', fontWeight: 700, fontSize: '1.2rem' }}>
                        {analysis.job_match.match_percentage}%
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
                        width: `${analysis.job_match.match_percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, #1e9ff5, #3b82f6)`,
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                  
                  {analysis.job_match.matching_skills && analysis.job_match.matching_skills.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ color: '#10b981', fontWeight: 500, marginBottom: '8px' }}>
                        ✅ Matching Skills ({analysis.job_match.matching_skills.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {analysis.job_match.matching_skills.slice(0, 10).map((skill, idx) => (
                          <span key={idx} style={{
                            padding: '4px 8px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: '#10b981',
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.job_match.missing_skills && analysis.job_match.missing_skills.length > 0 && (
                    <div>
                      <div style={{ color: '#f59e0b', fontWeight: 500, marginBottom: '8px' }}>
                        ⚠️ Missing Skills ({analysis.job_match.missing_skills.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {analysis.job_match.missing_skills.slice(0, 10).map((skill, idx) => (
                          <span key={idx} style={{
                            padding: '4px 8px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: '#f59e0b',
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.job_match.missing_keywords && analysis.job_match.missing_keywords.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ color: '#ef4444', fontWeight: 500, marginBottom: '8px' }}>
                        🔍 Missing Keywords ({analysis.job_match.missing_keywords.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {analysis.job_match.missing_keywords.slice(0, 15).map((keyword, idx) => (
                          <span key={idx} style={{
                            padding: '4px 8px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                          }}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div className="ci-stat-card" style={{
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e9ff5' }}>
                    {analysis.word_count}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                    Words
                  </div>
                </div>
                <div className="ci-stat-card" style={{
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                    {analysis.action_verbs_count}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                    Action Verbs
                  </div>
                </div>
                <div className="ci-stat-card" style={{
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                    {analysis.numbers_count}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                    Metrics
                  </div>
                </div>
                <div className="ci-stat-card" style={{
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>
                    {analysis.skills_found ? analysis.skills_found.length : 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '4px' }}>
                    Skills Found
                  </div>
                </div>
              </div>

              {/* Skills Found */}
              {analysis.skills_found && analysis.skills_found.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '12px' }}>
                    💻 Technical Skills Identified
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {analysis.skills_found.map((skill, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#a78bfa',
                        fontWeight: 500,
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '12px' }}>
                    ✅ Strengths
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} style={{
                        padding: '8px 12px',
                        marginBottom: '8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderLeft: '3px solid #10b981',
                        borderRadius: '4px',
                        color: '#e5e7eb',
                      }}>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '12px' }}>
                    💡 Optimization Suggestions
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx} style={{
                        padding: '8px 12px',
                        marginBottom: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderLeft: '3px solid #f59e0b',
                        borderRadius: '4px',
                        color: '#e5e7eb',
                      }}>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '12px' }}>
                    ⚠️ Areas for Improvement
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {analysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} style={{
                        padding: '8px 12px',
                        marginBottom: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderLeft: '3px solid #ef4444',
                        borderRadius: '4px',
                        color: '#e5e7eb',
                      }}>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Performance Report Summary */}
          {analysis && (
            <div className="ci-card" style={{ marginTop: '24px' }}>
              <h2 className="ci-card-title">📋 Performance Report Summary</h2>
              <div style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '8px' }}>
                    Overall Assessment
                  </h3>
                  <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
                    Your resume has an ATS compatibility score of <strong style={{ color: analysis.category_color }}>{analysis.ats_score}/100</strong>, 
                    which is <strong style={{ color: analysis.category_color }}>{analysis.category.toLowerCase()}</strong>. 
                    {analysis.ats_score >= 80 
                      ? " Your resume is well-optimized for ATS systems and should perform well in automated screening."
                      : analysis.ats_score >= 60
                      ? " Your resume is decently optimized but could benefit from the suggested improvements."
                      : " Your resume needs significant optimization to improve ATS compatibility. Focus on the recommendations above."
                    }
                  </p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '20px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '8px' }}>
                      Key Metrics
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
                      <li style={{ marginBottom: '4px' }}>• {analysis.word_count} words</li>
                      <li style={{ marginBottom: '4px' }}>• {analysis.skills_found ? analysis.skills_found.length : 0} technical skills identified</li>
                      <li style={{ marginBottom: '4px' }}>• {analysis.action_verbs_count} action verbs used</li>
                      <li style={{ marginBottom: '4px' }}>• {analysis.numbers_count} quantifiable metrics</li>
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '8px' }}>
                      Next Steps
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
                      <li style={{ marginBottom: '4px' }}>• Review and implement the optimization suggestions</li>
                      <li style={{ marginBottom: '4px' }}>• Add missing keywords from job descriptions</li>
                      <li style={{ marginBottom: '4px' }}>• Strengthen weak areas identified in the analysis</li>
                      <li style={{ marginBottom: '4px' }}>• Re-analyze after making improvements</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ResumeAnalyzer;

