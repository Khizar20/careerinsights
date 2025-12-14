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

export default function CounselorStyleSelection({ sessionId, onComplete, navigate: customNavigate }) {
  const routerNavigate = useNavigate()
  const navigate = customNavigate || routerNavigate
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
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: '#9ca3af' }}>Loading counselor styles...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        borderRadius: '16px',
        padding: '40px',
        border: '1px solid rgba(30, 159, 245, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            color: '#e5e7eb', 
            marginBottom: '8px' 
          }}>
            Choose Your Counselor <span style={{ color: '#10b981' }}>Style</span>
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>
            Select how you'd like to interact with your career counselor
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px', 
          marginBottom: '32px' 
        }}>
          {styles.map((style) => {
            const Icon = styleIcons[style.id] || Smile
            const isSelected = selectedStyle === style.id

            return (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: `2px solid ${isSelected ? '#1e9ff5' : '#1f2937'}`,
                  background: isSelected ? 'rgba(30, 159, 245, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  boxShadow: isSelected ? '0 4px 12px rgba(30, 159, 245, 0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#3b82f6'
                    e.currentTarget.style.background = 'rgba(30, 159, 245, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#1f2937'
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(30, 159, 245, 0.2)' : 'rgba(31, 41, 55, 0.6)'
                  }}>
                    <Icon size={24} color={isSelected ? '#1e9ff5' : '#9ca3af'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontWeight: 600, 
                      fontSize: '1.1rem', 
                      color: '#e5e7eb', 
                      marginBottom: '4px' 
                    }}>
                      {style.name}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                      {style.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#1e9ff5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#ffffff'
                      }}></div>
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
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            background: (!selectedStyle || updating) ? '#6b7280' : 'linear-gradient(135deg, #1e9ff5, #3b82f6)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: (!selectedStyle || updating) ? 'not-allowed' : 'pointer',
            boxShadow: (!selectedStyle || updating) ? 'none' : '0 4px 12px rgba(30, 159, 245, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (selectedStyle && !updating) {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 16px rgba(30, 159, 245, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedStyle && !updating) {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(30, 159, 245, 0.3)'
            }
          }}
        >
          {updating ? 'Updating...' : 'Continue to Stage 1 Questions →'}
        </button>
      </div>
    </div>
  )
}
