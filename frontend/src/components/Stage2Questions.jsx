import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Loader, CheckCircle } from 'lucide-react'
import axios from 'axios'

export default function Stage2Questions({ sessionId, onComplete }) {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [domain, setDomain] = useState('')
  const [answers, setAnswers] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [careerResult, setCareerResult] = useState(null)

  useEffect(() => {
    fetchSessionAndQuestions()
  }, [])

  const fetchSessionAndQuestions = async () => {
    try {
      const sessionResponse = await axios.get(`/api/session/${sessionId}`)
      const predictedDomain = sessionResponse.data.predicted_domain
      setDomain(predictedDomain)

      const questionsResponse = await axios.get(`/api/questions/stage2/${predictedDomain}`)
      setQuestions(questionsResponse.data.questions)
    } catch (err) {
      console.error('Error fetching data:', err)
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

      const response = await axios.post(`/api/session/${sessionId}/stage2`, {
        answers: answersArray
      })

      setCareerResult(response.data)
      setTimeout(() => {
        onComplete()
        navigate('/results')
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
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto text-primary-600 mb-4" />
          <p className="text-gray-700">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (submitting && !careerResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center animate-pulse">
              <Loader className="h-8 w-8 text-primary-600 animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary-200 animate-[spin_6s_linear_infinite]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Finding Your Best-Fit Career
          </h2>
          <p className="text-gray-600 max-w-md text-center">
            We’re combining your profile with all of your answers to identify the specific
            career that aligns most closely with your strengths and aspirations.
          </p>
          <p className="text-sm text-primary-600 animate-pulse">
            Hang tight — your personalized result is on the way...
          </p>
        </div>
      </div>
    )
  }

  if (careerResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Career Predicted!</h2>
          <p className="text-xl text-primary-600 font-semibold mb-4">
            {careerResult.predicted_career.replace('_', ' ').toUpperCase()}
          </p>
          <p className="text-gray-600 mb-2">Confidence: {(careerResult.career_confidence * 100).toFixed(1)}%</p>
          <p className="text-sm text-gray-500">Generating your report...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return null

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-4">
          <div className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {domain.replace('_', ' ').toUpperCase()} Domain
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentQ.question}</h2>
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => {
              const optionLetter = option.split(')')[0] + ')'
              const isSelected = answers[currentQ.number] === optionLetter

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(optionLetter)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
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
            disabled={currentQuestion === 0}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!answers[currentQ.number] || submitting}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
