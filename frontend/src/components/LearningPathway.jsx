import { useState, useEffect } from 'react'
import { CheckCircle, Circle, BookOpen, Award, Target, TrendingUp } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function LearningPathway({ sessionId }) {
  const [pathwayData, setPathwayData] = useState(null)
  const [progress, setProgress] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const markdownComponents = {
    h1: ({ node, ...props }) => (
      <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-xl font-semibold mt-5 mb-3 text-gray-900" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="text-lg font-semibold mt-4 mb-2 text-gray-900" {...props} />
    ),
    p: ({ node, ...props }) => (
      <p className="mb-3 text-gray-700 leading-relaxed" {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong className="font-semibold text-gray-900" {...props} />
    ),
    em: ({ node, ...props }) => (
      <em className="italic text-gray-800" {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-700" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-6 mb-3 space-y-1 text-gray-700" {...props} />
    ),
    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-200 text-sm" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className="bg-gray-100" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th
        className="border border-gray-200 px-3 py-2 font-semibold text-gray-900 text-left"
        {...props}
      />
    ),
    td: ({ node, ...props }) => (
      <td className="border border-gray-200 px-3 py-2 align-top text-gray-700" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="text-primary-600 hover:underline" target="_blank" rel="noreferrer" {...props} />
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
      // Frontend logging for debugging progress updates
      // eslint-disable-next-line no-console
      console.log('[LearningPathway] updateProgress clicked', { type, item, progress })

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

      // eslint-disable-next-line no-console
      console.log('[LearningPathway] sending progress update', updateData)

      await axios.post(`/api/session/${sessionId}/progress/update`, updateData)
      // eslint-disable-next-line no-console
      console.log('[LearningPathway] progress update saved')
      await fetchPathway()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error updating progress:', err)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">Loading learning pathway...</div>
      </div>
    )
  }

  const progressPercentage = progress?.progress_percentage || 0
  const isComplete = progressPercentage >= 99.9

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Learning Pathway</h2>
          <p className="text-gray-600 mb-6">
            Personalized roadmap for {pathwayData?.career?.replace('_', ' ') || 'your career'}
          </p>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${progressPercentage}%` }}
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
            {/* Floating balloon-like decorations */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-6 bottom-0 w-6 h-9 bg-pink-400 rounded-full animate-bounce opacity-80 shadow-md" />
              <div className="absolute left-16 bottom-4 w-5 h-8 bg-purple-400 rounded-full animate-bounce opacity-80 shadow-md delay-150" />
              <div className="absolute right-10 bottom-2 w-7 h-10 bg-emerald-400 rounded-full animate-bounce opacity-80 shadow-md delay-200" />
              <div className="absolute right-4 bottom-8 w-5 h-8 bg-blue-400 rounded-full animate-bounce opacity-80 shadow-md delay-300" />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-50 p-6 flex items-center">
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-emerald-200 opacity-40 blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-emerald-300 opacity-30 blur-3xl" />
              <div className="relative flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-bounce">
                    <CheckCircle className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-900 mb-1">
                    Congratulations! You’ve completed your learning pathway.
                  </h3>
                  <p className="text-sm text-emerald-800">
                    You’ve marked all courses, certifications, skills, and milestones as complete. Take a moment to
                    celebrate your progress, then consider revisiting key topics, starting a new pathway, or applying
                    your skills in real-world projects and job applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {pathwayData?.phases && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary-600" />
              <span>Learning Phases</span>
            </h3>
            <div className="space-y-4">
              {Object.entries(pathwayData.phases).map(([phase, description]) => (
                <div key={phase} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 capitalize mb-2">{phase}</h4>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {pathwayData?.courses && pathwayData.courses.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary-600" />
              <span>Recommended Courses</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.courses.map((course, idx) => {
                const isCompleted = progress?.completed_courses?.includes(course) || false
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="flex flex-col">
                        <span className={isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}>
                          {course}
                        </span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(course)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center px-2.5 py-1 mt-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 w-40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open course link
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => updateProgress('course', course)}
                      disabled={updating}
                      className="text-sm font-medium w-40 text-right"
                    >
                      {isCompleted ? (
                        <span className="text-gray-500 hover:text-gray-700">Mark Incomplete</span>
                      ) : (
                        <span className="text-primary-600 hover:text-primary-700">Mark Complete</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pathwayData?.certifications && pathwayData.certifications.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary-600" />
              <span>Certifications</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.certifications.map((cert, idx) => {
                const isCompleted = progress?.completed_certifications?.includes(cert) || false
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="flex flex-col">
                        <span className={isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}>
                          {cert}
                        </span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(cert)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center px-2.5 py-1 mt-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 w-40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open certification link
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => updateProgress('certification', cert)}
                      disabled={updating}
                      className="text-sm font-medium w-40 text-right"
                    >
                      {isCompleted ? (
                        <span className="text-gray-500 hover:text-gray-700">Mark Incomplete</span>
                      ) : (
                        <span className="text-primary-600 hover:text-primary-700">Mark Complete</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pathwayData?.skills && pathwayData.skills.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary-600" />
              <span>Key Skills to Develop</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.skills.map((skill, idx) => {
                const isCompleted = progress?.completed_skills?.includes(skill) || false
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className={isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}>
                        {skill}
                      </span>
                    </div>
                    <button
                      onClick={() => updateProgress('skill', skill)}
                      disabled={updating}
                      className="text-sm font-medium"
                    >
                      {isCompleted ? (
                        <span className="text-gray-500 hover:text-gray-700">Mark Incomplete</span>
                      ) : (
                        <span className="text-primary-600 hover:text-primary-700">Mark Complete</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pathwayData?.milestones && pathwayData.milestones.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              <span>Milestones</span>
            </h3>
            <div className="space-y-2">
              {pathwayData.milestones.map((milestone, idx) => {
                const isCompleted = progress?.completed_milestones?.includes(milestone) || false
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className={isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}>
                        {milestone}
                      </span>
                    </div>
                    <button
                      onClick={() => updateProgress('milestone', milestone)}
                      disabled={updating}
                      className="text-sm font-medium"
                    >
                      {isCompleted ? (
                        <span className="text-gray-500 hover:text-gray-700">Mark Incomplete</span>
                      ) : (
                        <span className="text-primary-600 hover:text-primary-700">Mark Complete</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {recommendations?.recommendations && recommendations.recommendations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              <span>Adaptive Recommendations</span>
            </h3>
            <div className="space-y-3">
              {recommendations.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    rec.priority === 'high'
                      ? 'border-red-500 bg-red-50'
                      : rec.priority === 'medium'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        rec.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : rec.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
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
          <div className="mt-10 p-8 bg-gray-50 rounded-2xl border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Detailed Learning Pathway
            </h3>
            <div className="max-w-none text-gray-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {pathwayData.description}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

