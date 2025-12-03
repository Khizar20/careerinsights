import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, BookOpen, Heart, Award } from 'lucide-react'
import axios from 'axios'

export default function IntakeForm({ onComplete }) {
  const navigate = useNavigate()
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
    // Name: letters and spaces only
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
    // Interests: letters, spaces, and basic punctuation like , . : ; ! ? & - ( )
    const interestsPattern = /^[A-Za-z\s0-9,.:;!?\-&()']+$/
    if (!interests) {
      errors.interests = 'Please share a few of your interests.'
    } else if (!interestsPattern.test(interestsRaw)) {
      errors.interests = 'Interests can only contain letters, numbers, spaces, and basic punctuation (, . : ; ! ? - & () \').'
    } else if (interests.length < 10) {
      errors.interests = 'Interests should be at least 10 characters for better recommendations.'
    }

    const skillsRaw = formData.skills
    const skills = skillsRaw.trim()
    // Skills: letters, numbers, commas, spaces
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
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Career Counseling</h2>
          <p className="text-gray-600">Let's start by learning about you</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4" />
              <span>Name</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your name"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4" />
              <span>Age</span>
            </label>
            <input
              type="number"
              min="16"
              max="100"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your age"
            />
            {fieldErrors.age && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.age}</p>
            )}
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="h-4 w-4" />
              <span>Education Level</span>
            </label>
            <select
              value={formData.education}
              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select your highest education level</option>
              <option value="High School">High School</option>
              <option value="Diploma / Associate Degree">Diploma / Associate Degree</option>
              <option value="Bachelor's Degree">Bachelor's Degree</option>
              <option value="Master's Degree">Master's Degree</option>
              <option value="PhD / Doctorate">PhD / Doctorate</option>
              <option value="Other">Other</option>
            </select>
            {fieldErrors.education && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.education}</p>
            )}
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Heart className="h-4 w-4" />
              <span>Interests</span>
            </label>
            <textarea
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Programming, Medicine, Business"
              rows="3"
            />
            {fieldErrors.interests && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.interests}</p>
            )}
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Award className="h-4 w-4" />
              <span>Skills</span>
            </label>
            <textarea
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Python, Communication, Leadership"
              rows="3"
            />
            {fieldErrors.skills && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.skills}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Session...' : 'Continue to Counselor Style Selection'}
          </button>
        </form>
      </div>
    </div>
  )
}
