import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, TrendingUp, BookOpen, ArrowRight } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Results({ sessionId }) {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const response = await axios.get(`/api/session/${sessionId}`)
      setSession(response.data)
    } catch (err) {
      console.error('Error fetching results:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">Loading results...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">No results found</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Career Prediction Results</h2>
          <p className="text-gray-600">Based on your profile and questionnaire responses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Predicted Domain</h3>
            </div>
            <p className="text-2xl font-bold text-blue-700 mb-2">
              {session.predicted_domain?.replace('_', ' ').toUpperCase() || 'N/A'}
            </p>
            <p className="text-sm text-gray-600">
              Confidence: {session.domain_confidence ? (session.domain_confidence * 100).toFixed(1) : 'N/A'}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <FileText className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Predicted Career</h3>
            </div>
            <p className="text-2xl font-bold text-purple-700 mb-2">
              {session.predicted_career?.replace('_', ' ').toUpperCase() || 'N/A'}
            </p>
            <p className="text-sm text-gray-600">
              Confidence: {session.career_confidence ? (session.career_confidence * 100).toFixed(1) : 'N/A'}%
            </p>
          </div>
        </div>

        {session.report && (
          <div className="mb-10">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-primary-600" />
              <h3 className="text-xl font-bold text-gray-900">Your Career Report</h3>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-8 rounded-2xl border border-blue-100">
              <div className="max-w-none text-gray-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {session.report}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/pathway')}
          className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          <BookOpen className="h-5 w-5" />
          <span>View Learning Pathway</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

