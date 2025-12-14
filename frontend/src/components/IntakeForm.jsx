import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, BookOpen, Heart, Award } from 'lucide-react'
import axios from 'axios'

export default function IntakeForm({ onComplete, navigate: customNavigate }) {
  const routerNavigate = useNavigate()
  const navigate = customNavigate || routerNavigate
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    education: '',
    interests: '',
    skills: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const validateForm = () => {
    const errors = {}

    const name = formData.name.trim()
    const namePattern = /^[A-Za-z\s]+$/
    if (!name) {
      errors.name = 'Name is required.'
    } else if (!namePattern.test(name)) {
      errors.name = 'Name can only contain letters and spaces.'
    } else if (name.length < 2) {
      errors.name = 'Name should be at least 2 characters long.'
    }

    const ageNumber = Number(formData.age)
    if (!formData.age) {
      errors.age = 'Age is required.'
    } else if (Number.isNaN(ageNumber)) {
      errors.age = 'Age must be a valid number.'
    } else if (ageNumber < 16 || ageNumber > 100) {
      errors.age = 'Age must be between 16 and 100.'
    }

    if (!formData.education) {
      errors.education = 'Please select your highest education level.'
    }

    const interestsRaw = formData.interests
    const interests = interestsRaw.trim()
    const interestsPattern = /^[A-Za-z\s0-9,.:;!?\-&()']+$/
    if (!interests) {
      errors.interests = 'Please share a few of your interests.'
    } else if (!interestsPattern.test(interestsRaw)) {
      errors.interests = 'Interests can only contain letters, numbers, spaces, and basic punctuation.'
    } else if (interests.length < 10) {
      errors.interests = 'Interests should be at least 10 characters for better recommendations.'
    }

    const skillsRaw = formData.skills
    const skills = skillsRaw.trim()
    const skillsPattern = /^[A-Za-z0-9,\s]+$/
    if (!skills) {
      errors.skills = 'Please list some of your key skills.'
    } else if (!skillsPattern.test(skillsRaw)) {
      errors.skills = 'Skills can only contain letters, numbers, commas, and spaces.'
    } else if (skills.length < 10) {
      errors.skills = 'Skills should be at least 10 characters for better recommendations.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/session/create', {
        ...formData,
        age: parseInt(formData.age, 10)
      })
      
      localStorage.setItem('sessionId', response.data.session_id)
      onComplete(response.data.session_id)
      navigate('/style')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
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
            Welcome to Career <span style={{ color: '#10b981' }}>Counseling</span>
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>
            Let's start by learning about you
          </p>
        </div>

        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.95rem', 
              fontWeight: 500, 
              color: '#e5e7eb', 
              marginBottom: '8px' 
            }}>
              <User size={18} color="#1e9ff5" />
              <span>Name</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1f2937',
                background: '#020617',
                color: '#e5e7eb',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="Enter your name"
            />
            {fieldErrors.name && (
              <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#ef4444' }}>
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.95rem', 
              fontWeight: 500, 
              color: '#e5e7eb', 
              marginBottom: '8px' 
            }}>
              <User size={18} color="#1e9ff5" />
              <span>Age</span>
            </label>
            <input
              type="number"
              min="16"
              max="100"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1f2937',
                background: '#020617',
                color: '#e5e7eb',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="Enter your age"
            />
            {fieldErrors.age && (
              <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#ef4444' }}>
                {fieldErrors.age}
              </p>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.95rem', 
              fontWeight: 500, 
              color: '#e5e7eb', 
              marginBottom: '8px' 
            }}>
              <BookOpen size={18} color="#1e9ff5" />
              <span>Education Level</span>
            </label>
            <select
              value={formData.education}
              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1f2937',
                background: '#020617',
                color: '#e5e7eb',
                fontSize: '1rem',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ background: '#020617', color: '#9ca3af' }}>
                Select your highest education level
              </option>
              <option value="High School" style={{ background: '#020617' }}>High School</option>
              <option value="Diploma / Associate Degree" style={{ background: '#020617' }}>Diploma / Associate Degree</option>
              <option value="Bachelor's Degree" style={{ background: '#020617' }}>Bachelor's Degree</option>
              <option value="Master's Degree" style={{ background: '#020617' }}>Master's Degree</option>
              <option value="PhD / Doctorate" style={{ background: '#020617' }}>PhD / Doctorate</option>
              <option value="Other" style={{ background: '#020617' }}>Other</option>
            </select>
            {fieldErrors.education && (
              <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#ef4444' }}>
                {fieldErrors.education}
              </p>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.95rem', 
              fontWeight: 500, 
              color: '#e5e7eb', 
              marginBottom: '8px' 
            }}>
              <Heart size={18} color="#1e9ff5" />
              <span>Interests</span>
            </label>
            <textarea
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1f2937',
                background: '#020617',
                color: '#e5e7eb',
                fontSize: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '100px'
              }}
              placeholder="e.g., Programming, Medicine, Business"
              rows="3"
            />
            {fieldErrors.interests && (
              <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#ef4444' }}>
                {fieldErrors.interests}
              </p>
            )}
          </div>

          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.95rem', 
              fontWeight: 500, 
              color: '#e5e7eb', 
              marginBottom: '8px' 
            }}>
              <Award size={18} color="#1e9ff5" />
              <span>Skills</span>
            </label>
            <textarea
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1f2937',
                background: '#020617',
                color: '#e5e7eb',
                fontSize: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '100px'
              }}
              placeholder="e.g., Python, Communication, Leadership"
              rows="3"
            />
            {fieldErrors.skills && (
              <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#ef4444' }}>
                {fieldErrors.skills}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              background: loading ? '#6b7280' : 'linear-gradient(135deg, #1e9ff5, #3b82f6)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(30, 159, 245, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(30, 159, 245, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(30, 159, 245, 0.3)'
              }
            }}
          >
            {loading ? 'Creating Session...' : 'Continue to Counselor Style Selection →'}
          </button>
        </form>
      </div>
    </div>
  )
}
