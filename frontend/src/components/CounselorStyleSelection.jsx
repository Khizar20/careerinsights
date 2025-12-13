import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smile, Briefcase, Heart, Brain } from 'lucide-react'
import axios from 'axios'

const styleIcons = {
  friendly: Smile,
  professional: Briefcase,
  warm: Heart,
  reflective: Brain
}

export default function CounselorStyleSelection({ sessionId, onComplete }) {
  const navigate = useNavigate()
  const [styles, setStyles] = useState([])
  const [selectedStyle, setSelectedStyle] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchStyles()
  }, [])

  const fetchStyles = async () => {
    try {
      const response = await axios.get('/api/counselor-styles')
      setStyles(response.data.styles)
      if (response.data.styles.length > 0) {
        setSelectedStyle(response.data.styles[0].id)
      }
    } catch (err) {
      console.error('Error fetching styles:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    if (!selectedStyle || !sessionId) return

    setUpdating(true)
    try {
      await axios.post(`/api/session/${sessionId}/update-style`, {
        counselor_style: selectedStyle
      })
      onComplete()
      navigate('/stage1')
    } catch (err) {
      console.error('Error updating style:', err)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">Loading counselor styles...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Counselor Style</h2>
          <p className="text-gray-600">Select how you'd like to interact with your career counselor</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {styles.map((style) => {
            const Icon = styleIcons[style.id] || Smile
            const isSelected = selectedStyle === style.id

            return (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${isSelected ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-primary-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">{style.name}</h3>
                    <p className="text-sm text-gray-600">{style.description}</p>
                  </div>
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

        <button
          onClick={handleContinue}
          disabled={!selectedStyle || updating}
          className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? 'Updating...' : 'Continue to Stage 1 Questions'}
        </button>
      </div>
    </div>
  )
}
