import { useState, useEffect } from 'react'
import { CheckCircle, Circle, BookOpen, Award, Target, TrendingUp, Loader, RefreshCw } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function LearningPathway({ sessionId, onStartOver }) {
  const [pathwayData, setPathwayData] = useState(null)
  const [progress, setProgress] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const markdownComponents = {
    h1: ({ node, ...props }) => (
      <h1 className="text-3xl font-bold mt-6 mb-4" style={{ color: '#e5e7eb' }} {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3" style={{ color: '#e5e7eb' }} {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-xl font-semibold mt-5 mb-3" style={{ color: '#e5e7eb' }} {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="text-lg font-semibold mt-4 mb-2" style={{ color: '#e5e7eb' }} {...props} />
    ),
    p: ({ node, ...props }) => (
      <p className="mb-3 leading-relaxed" style={{ color: '#9ca3af' }} {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong className="font-semibold" style={{ color: '#e5e7eb' }} {...props} />
    ),
    em: ({ node, ...props }) => (
      <em className="italic" style={{ color: '#9ca3af' }} {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc pl-6 mb-3 space-y-1" style={{ color: '#9ca3af' }} {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-6 mb-3 space-y-1" style={{ color: '#9ca3af' }} {...props} />
    ),
    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border text-sm" style={{ borderColor: '#374151' }} {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead style={{ background: '#1f2937' }} {...props} />
    ),
    th: ({ node, ...props }) => (
      <th
        className="px-3 py-2 font-semibold text-left border-b"
        style={{ borderColor: '#374151', color: '#e5e7eb' }}
        {...props}
      />
    ),
    td: ({ node, ...props }) => (
      <td className="px-3 py-2 align-top border-b" style={{ borderColor: '#374151', color: '#9ca3af' }} {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="hover:underline" style={{ color: '#1e9ff5' }} target="_blank" rel="noreferrer" {...props} />
    )
  }

  useEffect(() => {
    fetchPathway()
  }, [])

  const fetchPathway = async () => {
    try {
      const response = await axios.get(`/api/session/${sessionId}/progress`)
      setPathwayData(response.data.pathway)
      setProgress(response.data.progress)
      setRecommendations(response.data.recommendations)
    } catch (err) {
      console.error('Error fetching pathway:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateProgress = async (type, item) => {
    setUpdating(true)
    try {
      const updateData = {
        completed_courses: [...(progress?.completed_courses || [])],
        completed_certifications: [...(progress?.completed_certifications || [])],
        completed_skills: [...(progress?.completed_skills || [])],
        completed_milestones: [...(progress?.completed_milestones || [])]
      }

      if (type === 'course') {
        const idx = updateData.completed_courses.indexOf(item)
        if (idx === -1) {
          updateData.completed_courses.push(item)
        } else {
          updateData.completed_courses.splice(idx, 1)
        }
      } else if (type === 'certification') {
        const idx = updateData.completed_certifications.indexOf(item)
        if (idx === -1) {
          updateData.completed_certifications.push(item)
        } else {
          updateData.completed_certifications.splice(idx, 1)
        }
      } else if (type === 'skill') {
        const idx = updateData.completed_skills.indexOf(item)
        if (idx === -1) {
          updateData.completed_skills.push(item)
        } else {
          updateData.completed_skills.splice(idx, 1)
        }
      } else if (type === 'milestone') {
        const idx = updateData.completed_milestones.indexOf(item)
        if (idx === -1) {
          updateData.completed_milestones.push(item)
        } else {
          updateData.completed_milestones.splice(idx, 1)
        }
      }

      await axios.post(`/api/session/${sessionId}/progress/update`, updateData)
      await fetchPathway()
    } catch (err) {
      console.error('Error updating progress:', err)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center" style={{ color: '#e5e7eb' }}>
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#1e9ff5' }} />
          <p>Loading your learning pathway...</p>
        </div>
      </div>
    )
  }

  if (!pathwayData || !progress) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center" style={{ color: '#e5e7eb' }}>
          <p className="mb-4">No learning pathway found for this session.</p>
          {onStartOver && (
            <button
              onClick={onStartOver}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                background: 'rgba(31, 41, 55, 0.5)',
                color: '#e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(31, 41, 55, 0.7)'
                e.target.style.borderColor = 'rgba(30, 159, 245, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(31, 41, 55, 0.5)'
                e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)'
              }}
            >
              <RefreshCw className="h-5 w-5" />
              Start Over
            </button>
          )}
        </div>
      </div>
    )
  }

  const progressPercentage = progress?.progress_percentage || 0
  const isComplete = progressPercentage >= 99.9

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderRadius: '16px',
        padding: '40px',
        border: '1px solid rgba(30, 159, 245, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        marginBottom: '32px'
      }}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#e5e7eb' }}>Your Learning Pathway</h2>
          <p className="mb-6" style={{ color: '#9ca3af' }}>
            Personalized roadmap for {pathwayData?.career?.replace('_', ' ') || 'your career'}
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: '#9ca3af' }}>Overall Progress</span>
              <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full rounded-full h-4" style={{ background: '#374151' }}>
              <div
                className="h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ 
                  width: `${Math.min(progressPercentage, 100)}%`,
                  background: 'linear-gradient(90deg, #1e9ff5, #1155c4)'
                }}
              >
                {progressPercentage > 10 && (
                  <span className="text-xs text-white font-semibold">{progressPercentage.toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isComplete && (
          <div className="mb-10 relative">
            <div style={{
              overflow: 'hidden',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                flexShrink: 0,
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ color: '#10b981' }}>
                  Congratulations! You've completed your learning pathway.
                </h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>
                  You've marked all courses, certifications, skills, and milestones as complete. Take a moment to
                  celebrate your progress, then consider revisiting key topics, starting a new pathway, or applying
                  your skills in real-world projects and job applications.
                </p>
              </div>
            </div>
          </div>
        )}

        {pathwayData?.phases && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5" style={{ color: '#1e9ff5' }} />
              <span style={{ color: '#e5e7eb' }}>Learning Phases</span>
            </h3>
            <div className="space-y-4">
              {Object.entries(pathwayData.phases).map(([phase, description]) => (
                <div 
                  key={phase} 
                  style={{
                    border: '1px solid rgba(55, 65, 81, 0.5)',
                    borderRadius: '8px',
                    padding: '16px',
                    background: 'rgba(31, 41, 55, 0.3)'
                  }}
                >
                  <h4 className="font-semibold capitalize mb-2" style={{ color: '#e5e7eb' }}>{phase}</h4>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>{description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {pathwayData?.courses && pathwayData.courses.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <BookOpen className="h-5 w-5" style={{ color: '#1e9ff5' }} />
              <span style={{ color: '#e5e7eb' }}>Recommended Courses</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.courses.map((course, idx) => {
                const isCompleted = progress?.completed_courses?.includes(course) || false
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '8px',
                      border: isCompleted ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid rgba(55, 65, 81, 0.5)',
                      background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(31, 41, 55, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" style={{ color: '#10b981' }} />
                      ) : (
                        <Circle className="h-5 w-5" style={{ color: '#6b7280' }} />
                      )}
                      <div className="flex flex-col flex-1">
                        <span style={{ 
                          color: isCompleted ? '#6b7280' : '#e5e7eb',
                          textDecoration: isCompleted ? 'line-through' : 'none'
                        }}>
                          {course}
                        </span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(course)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 10px',
                            marginTop: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            borderRadius: '999px',
                            background: 'rgba(30, 159, 245, 0.15)',
                            color: '#1e9ff5',
                            border: '1px solid rgba(30, 159, 245, 0.3)',
                            width: 'fit-content',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(30, 159, 245, 0.25)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(30, 159, 245, 0.15)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open course link
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => updateProgress('course', course)}
                      disabled={updating}
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        background: isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)',
                        color: isCompleted ? '#9ca3af' : '#1e9ff5',
                        opacity: updating ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.7)' : 'rgba(30, 159, 245, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)'
                        }
                      }}
                    >
                      {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pathwayData?.certifications && pathwayData.certifications.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Award className="h-5 w-5" style={{ color: '#1e9ff5' }} />
              <span style={{ color: '#e5e7eb' }}>Certifications</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.certifications.map((cert, idx) => {
                const isCompleted = progress?.completed_certifications?.includes(cert) || false
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '8px',
                      border: isCompleted ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid rgba(55, 65, 81, 0.5)',
                      background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(31, 41, 55, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" style={{ color: '#10b981' }} />
                      ) : (
                        <Circle className="h-5 w-5" style={{ color: '#6b7280' }} />
                      )}
                      <div className="flex flex-col flex-1">
                        <span style={{ 
                          color: isCompleted ? '#6b7280' : '#e5e7eb',
                          textDecoration: isCompleted ? 'line-through' : 'none'
                        }}>
                          {cert}
                        </span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(cert)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 10px',
                            marginTop: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            borderRadius: '999px',
                            background: 'rgba(30, 159, 245, 0.15)',
                            color: '#1e9ff5',
                            border: '1px solid rgba(30, 159, 245, 0.3)',
                            width: 'fit-content',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(30, 159, 245, 0.25)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(30, 159, 245, 0.15)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open certification link
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => updateProgress('certification', cert)}
                      disabled={updating}
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        background: isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)',
                        color: isCompleted ? '#9ca3af' : '#1e9ff5',
                        opacity: updating ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.7)' : 'rgba(30, 159, 245, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)'
                        }
                      }}
                    >
                      {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pathwayData?.skills && pathwayData.skills.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5" style={{ color: '#1e9ff5' }} />
              <span style={{ color: '#e5e7eb' }}>Key Skills to Develop</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.skills.map((skill, idx) => {
                const isCompleted = progress?.completed_skills?.includes(skill) || false
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '8px',
                      border: isCompleted ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid rgba(55, 65, 81, 0.5)',
                      background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(31, 41, 55, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" style={{ color: '#10b981' }} />
                      ) : (
                        <Circle className="h-5 w-5" style={{ color: '#6b7280' }} />
                      )}
                      <span style={{ 
                        color: isCompleted ? '#6b7280' : '#e5e7eb',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {skill}
                      </span>
                    </div>
                    <button
                      onClick={() => updateProgress('skill', skill)}
                      disabled={updating}
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        background: isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)',
                        color: isCompleted ? '#9ca3af' : '#1e9ff5',
                        opacity: updating ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.7)' : 'rgba(30, 159, 245, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)'
                        }
                      }}
                    >
                      {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pathwayData?.milestones && pathwayData.milestones.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" style={{ color: '#1e9ff5' }} />
              <span style={{ color: '#e5e7eb' }}>Milestones</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.milestones.map((milestone, idx) => {
                const isCompleted = progress?.completed_milestones?.includes(milestone) || false
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '8px',
                      border: isCompleted ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid rgba(55, 65, 81, 0.5)',
                      background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(31, 41, 55, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" style={{ color: '#10b981' }} />
                      ) : (
                        <Circle className="h-5 w-5" style={{ color: '#6b7280' }} />
                      )}
                      <span style={{ 
                        color: isCompleted ? '#6b7280' : '#e5e7eb',
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {milestone}
                      </span>
                    </div>
                    <button
                      onClick={() => updateProgress('milestone', milestone)}
                      disabled={updating}
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        background: isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)',
                        color: isCompleted ? '#9ca3af' : '#1e9ff5',
                        opacity: updating ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.7)' : 'rgba(30, 159, 245, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updating) {
                          e.target.style.background = isCompleted ? 'rgba(55, 65, 81, 0.5)' : 'rgba(30, 159, 245, 0.2)'
                        }
                      }}
                    >
                      {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {recommendations?.recommendations && recommendations.recommendations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" style={{ color: '#1e9ff5' }} />
              <span style={{ color: '#e5e7eb' }}>Adaptive Recommendations</span>
            </h3>
            <div className="space-y-3">
              {recommendations.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${
                      rec.priority === 'high'
                        ? '#ef4444'
                        : rec.priority === 'medium'
                        ? '#f59e0b'
                        : '#1e9ff5'
                    }`,
                    background: rec.priority === 'high'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : rec.priority === 'medium'
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(30, 159, 245, 0.1)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold mb-1" style={{ color: '#e5e7eb' }}>{rec.title}</h4>
                      <p className="text-sm" style={{ color: '#9ca3af' }}>{rec.description}</p>
                    </div>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: rec.priority === 'high'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : rec.priority === 'medium'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(30, 159, 245, 0.2)',
                        color: rec.priority === 'high'
                          ? '#f87171'
                          : rec.priority === 'medium'
                          ? '#fbbf24'
                          : '#1e9ff5'
                      }}
                    >
                      {rec.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pathwayData?.description && (
          <div style={{
            marginTop: '40px',
            padding: '32px',
            background: 'rgba(31, 41, 55, 0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(55, 65, 81, 0.5)'
          }}>
            <h3 className="text-xl font-semibold mb-4" style={{ color: '#e5e7eb' }}>
              Detailed Learning Pathway
            </h3>
            <div className="max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {pathwayData.description}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {onStartOver && (
          <div className="mt-8 text-center">
            <button
              onClick={onStartOver}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                background: 'rgba(31, 41, 55, 0.5)',
                color: '#e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(31, 41, 55, 0.7)'
                e.target.style.borderColor = 'rgba(30, 159, 245, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(31, 41, 55, 0.5)'
                e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)'
              }}
            >
              <RefreshCw className="h-5 w-5" />
              Start New Counseling Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
