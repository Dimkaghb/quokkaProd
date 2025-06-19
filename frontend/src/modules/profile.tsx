import { useEffect, useState } from "react"
import { useAuthStore } from '../shared/stores/authStore'
import { useNavigate } from 'react-router-dom'

export const Profile = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: false,
    darkMode: true,
    autoSave: true,
    language: 'en'
  })

    useEffect(() => {
    const savedImage = localStorage.getItem('profileImage')
    if (savedImage) {
      setProfileImage(savedImage)
        }
    }, [])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setProfileImage(result)
        localStorage.setItem('profileImage', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const mockAnalysisHistory = [
    { id: 1, name: "Sales Data Analysis", date: "2024-01-15", status: "completed", type: "CSV" },
    { id: 2, name: "Customer Insights", date: "2024-01-12", status: "completed", type: "JSON" },
    { id: 3, name: "Market Trends", date: "2024-01-10", status: "processing", type: "Excel" },
    { id: 4, name: "Financial Report", date: "2024-01-08", status: "completed", type: "PDF" }
  ]

  const usageData = {
    totalAnalyses: 23,
    dataProcessed: "2.4 GB",
    apiCalls: 156,
    storageUsed: "1.2 GB",
    planLimit: "5 GB"
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="fixed top-6 left-6 z-50 flex items-center space-x-2 text-white hover:text-gray-300 transition-colors group bg-gray-800/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-600 hover:border-gray-500 shadow-lg"
      >
        <svg 
          className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-gray-900/50 border-r border-gray-800 min-h-screen p-6">
          {/* Profile Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">🐨</span>
              </div>
              <span className="text-xl font-bold">quokkaAI</span>
            </div>
            
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 mb-8">
            {[
              { id: 'profile', label: 'Profile Settings', icon: '👤' },
              { id: 'history', label: 'Analysis History', icon: '📊' },
              { id: 'usage', label: 'Usage & Billing', icon: '💳' },
              { id: 'settings', label: 'Chat Settings', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Upgrade Section */}
          <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upgrade to Pro</h3>
              <p className="text-gray-400 text-sm mb-4">Unlock unlimited analyses and advanced features</p>
              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === 'profile' && (
            <div className="max-w-4xl">
              <h1 className="text-3xl font-light mb-8">Profile Settings</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        defaultValue={user?.name}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                      <textarea
                        rows={3}
                        placeholder="Tell us about yourself..."
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Security */}
                <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Account Security</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                      <input
                        type="password"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                      <input
                        type="password"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 border border-red-600 text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-6xl">
              <h1 className="text-3xl font-light mb-8">Analysis History</h1>
              
              <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Recent Analyses</h2>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                      Export All
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-800">
                  {mockAnalysisHistory.map((analysis) => (
                    <div key={analysis.id} className="px-6 py-4 hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{analysis.name}</h3>
                            <p className="text-sm text-gray-400">{analysis.date} • {analysis.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            analysis.status === 'completed' 
                              ? 'bg-green-600/20 text-green-400' 
                              : 'bg-yellow-600/20 text-yellow-400'
                          }`}>
                            {analysis.status}
                          </span>
                          <button className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="max-w-4xl">
              <h1 className="text-3xl font-light mb-8">Usage & Billing</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Total Analyses', value: usageData.totalAnalyses, icon: '📊' },
                  { label: 'Data Processed', value: usageData.dataProcessed, icon: '💾' },
                  { label: 'API Calls', value: usageData.apiCalls, icon: '🔗' },
                  { label: 'Storage Used', value: usageData.storageUsed, icon: '🗄️' }
                ].map((stat, index) => (
                  <div key={index} className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{stat.icon}</span>
                      <h3 className="font-medium text-gray-300">{stat.label}</h3>
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Current Plan: Free</h2>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-300">Storage Usage</span>
                  <span className="text-gray-300">{usageData.storageUsed} / {usageData.planLimit}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                </div>
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all">
                  Upgrade to Pro - $29/month
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl">
              <h1 className="text-3xl font-light mb-8">Chat Settings</h1>
              
              <div className="space-y-6">
                {[
                  { key: 'notifications', label: 'Push Notifications', description: 'Receive notifications for analysis completion' },
                  { key: 'emailUpdates', label: 'Email Updates', description: 'Get weekly reports and feature updates via email' },
                  { key: 'darkMode', label: 'Dark Mode', description: 'Use dark theme throughout the application' },
                  { key: 'autoSave', label: 'Auto Save', description: 'Automatically save your work every few minutes' }
                ].map((setting) => (
                  <div key={setting.key} className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white mb-1">{setting.label}</h3>
                        <p className="text-gray-400 text-sm">{setting.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[setting.key as keyof typeof settings] as boolean}
                          onChange={(e) => setSettings(prev => ({ ...prev, [setting.key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                ))}
                
                <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white mb-1">Language</h3>
                      <p className="text-gray-400 text-sm">Choose your preferred language</p>
                    </div>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  </div>
  )
}   