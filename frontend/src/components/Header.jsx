import { GraduationCap } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Career Counseling</h1>
            <p className="text-sm text-gray-600">RAG-Powered Career Prediction & Learning Pathway</p>
          </div>
        </div>
      </div>
    </header>
  )
}
