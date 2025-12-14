import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Loader, CheckCircle } from 'lucide-react'
import axios from 'axios'

export default function Stage1Questions({ sessionId, onComplete, navigate: customNavigate }) {
  const routerNavigate = useNavigate()
  const navigate = customNavigate || routerNavigate
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [domainResult, setDomainResult] = useState(null)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const response = await axios.get('/api/questions/stage1')
      setQuestions(response.data.questions)
    } catch (err) {
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [questions[currentQuestion].number]: answer })
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const answersArray = Object.entries(answers).map(([question_number, answer]) => ({
        question_number: parseInt(question_number),
        answer: answer
      }))

      const response = await axios.post(`/api/session/${sessionId}/stage1`, {
        answers: answersArray
      })

      setDomainResult(response.data)
      setTimeout(() => {
        onComplete()
        navigate('/stage2')
      }, 3000)
    } catch (err) {
      console.error('Error submitting answers:', err)
      alert('Error submitting answers. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center" style={{ color: '#e5e7eb' }}>
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#1e9ff5' }} />
          <p>Loading questions...</p>
        </div>
      </div>
    )
  }

  if (submitting && !domainResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid rgba(30, 159, 245, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}>
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-pulse" style={{ background: 'rgba(30, 159, 245, 0.2)' }}>
              <Loader className="h-8 w-8 animate-spin" style={{ color: '#1e9ff5' }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#e5e7eb' }}>
            Analyzing Your Responses
          </h2>
          <p className="max-w-md mx-auto" style={{ color: '#9ca3af' }}>
            We're carefully reviewing your answers to understand which career domain best
            matches your interests, strengths, and preferences.
          </p>
          <p className="text-sm mt-4 animate-pulse" style={{ color: '#1e9ff5' }}>
            This usually takes just a few seconds...
          </p>
        </div>
      </div>
    )
  }

  if (domainResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid rgba(30, 159, 245, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}>
          <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: '#10b981' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#e5e7eb' }}>Domain Predicted!</h2>
          <p className="text-xl font-semibold mb-4" style={{ color: '#1e9ff5' }}>
            {domainResult.predicted_domain?.replace('_', ' ').toUpperCase() || 'Processing...'}
          </p>
          <p className="mb-2" style={{ color: '#9ca3af' }}>Confidence: {domainResult.confidence ? (domainResult.confidence * 100).toFixed(1) : 'N/A'}%</p>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Redirecting to Stage 2...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return null

  const currentQ = questions[currentQuestion]
  const progress = questions.length > 0 ? Math.min(((currentQuestion + 1) / questions.length) * 100, 100) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderRadius: '16px',
        padding: '40px',
        border: '1px solid rgba(30, 159, 245, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="mb-6">
          <div className="flex justify-between items-center text-sm mb-3">
            <span className="font-medium" style={{ color: '#e5e7eb' }}>Question {currentQuestion + 1} of {questions.length}</span>
            <span style={{ color: '#9ca3af' }}>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full rounded-full h-2.5" style={{ background: '#374151' }}>
            <div
              className="h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: '#1e9ff5' }}
            ></div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#e5e7eb' }}>{currentQ.question}</h2>
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = answers[currentQ.number] === option

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #1e9ff5' : '2px solid rgba(55, 65, 81, 0.5)',
                    background: isSelected ? 'rgba(30, 159, 245, 0.1)' : 'rgba(31, 41, 55, 0.3)',
                    color: '#e5e7eb',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.target.style.borderColor = 'rgba(30, 159, 245, 0.5)'
                      e.target.style.background = 'rgba(31, 41, 55, 0.5)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)'
                      e.target.style.background = 'rgba(31, 41, 55, 0.3)'
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: '#e5e7eb' }}>{option}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#1e9ff5' }}>
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0 || submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(55, 65, 81, 0.5)',
              background: currentQuestion === 0 ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.5)',
              color: currentQuestion === 0 ? '#6b7280' : '#e5e7eb',
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
              opacity: currentQuestion === 0 ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (currentQuestion > 0) {
                e.target.style.background = 'rgba(31, 41, 55, 0.7)'
                e.target.style.borderColor = 'rgba(30, 159, 245, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (currentQuestion > 0) {
                e.target.style.background = 'rgba(31, 41, 55, 0.5)'
                e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)'
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!answers[currentQ.number] || submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: !answers[currentQ.number] ? 'rgba(30, 159, 245, 0.3)' : '#1e9ff5',
              color: '#ffffff',
              fontWeight: 600,
              cursor: !answers[currentQ.number] ? 'not-allowed' : 'pointer',
              opacity: !answers[currentQ.number] ? 0.5 : 1,
              transition: 'all 0.2s',
              boxShadow: !answers[currentQ.number] ? 'none' : '0 4px 12px rgba(30, 159, 245, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (answers[currentQ.number]) {
                e.target.style.background = '#1155c4'
                e.target.style.boxShadow = '0 6px 16px rgba(30, 159, 245, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (answers[currentQ.number]) {
                e.target.style.background = '#1e9ff5'
                e.target.style.boxShadow = '0 4px 12px rgba(30, 159, 245, 0.3)'
              }
            }}
          >
            <span>{currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
