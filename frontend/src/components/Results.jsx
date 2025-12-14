import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, TrendingUp, BookOpen, ArrowRight, Loader } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Results({ sessionId, navigate: customNavigate }) {
  const routerNavigate = useNavigate()
  const navigate = customNavigate || routerNavigate
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <div className="text-center" style={{ color: '#e5e7eb' }}>
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#1e9ff5' }} />
          <p>Loading your career results...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center" style={{ color: '#e5e7eb' }}>No results found</div>
      </div>
    )
  }

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
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#e5e7eb' }}>Your Career Prediction Results</h2>
          <p style={{ color: '#9ca3af' }}>Based on your profile and questionnaire responses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 159, 245, 0.15), rgba(17, 85, 196, 0.15))',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid rgba(30, 159, 245, 0.2)'
          }}>
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="h-6 w-6" style={{ color: '#1e9ff5' }} />
              <h3 className="text-lg font-semibold" style={{ color: '#e5e7eb' }}>Predicted Domain</h3>
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: '#1e9ff5' }}>
              {session.predicted_domain?.replace('_', ' ').toUpperCase() || 'N/A'}
            </p>
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Confidence: {session.domain_confidence ? (session.domain_confidence * 100).toFixed(1) : 'N/A'}%
            </p>
            {session.domain_reasoning && (
              <p className="text-xs mt-2" style={{ color: '#6b7280', fontStyle: 'italic' }}>
                {session.domain_reasoning.substring(0, 100)}...
              </p>
            )}
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div className="flex items-center space-x-3 mb-3">
              <FileText className="h-6 w-6" style={{ color: '#10b981' }} />
              <h3 className="text-lg font-semibold" style={{ color: '#e5e7eb' }}>Predicted Career</h3>
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: '#10b981' }}>
              {session.predicted_career?.replace('_', ' ').toUpperCase() || 'N/A'}
            </p>
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Confidence: {session.career_confidence ? (session.career_confidence * 100).toFixed(1) : 'N/A'}%
            </p>
            {session.career_reasoning && (
              <p className="text-xs mt-2" style={{ color: '#6b7280', fontStyle: 'italic' }}>
                {session.career_reasoning.substring(0, 100)}...
              </p>
            )}
          </div>
        </div>

        {session.report && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5" style={{ color: '#1e9ff5' }} />
              <h3 className="text-xl font-bold" style={{ color: '#e5e7eb' }}>Your Career Report</h3>
            </div>
            <div style={{
              background: 'rgba(31, 41, 55, 0.5)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(30, 159, 245, 0.1)',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              <div className="max-w-none">
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
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: '#1e9ff5',
            color: '#ffffff',
            padding: '16px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(30, 159, 245, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#1155c4'
            e.target.style.boxShadow = '0 6px 16px rgba(30, 159, 245, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#1e9ff5'
            e.target.style.boxShadow = '0 4px 12px rgba(30, 159, 245, 0.3)'
          }}
        >
          <BookOpen className="h-5 w-5" />
          <span>View Learning Pathway</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
