import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from '../components/ThemeToggle'

function RiskAnalysis() {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    roadType: 'residential'
  })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const roadTypes = [
    { value: 'residential', label: 'Residential Street' },
    { value: 'highway', label: 'Highway' },
    { value: 'interstate', label: 'Interstate' },
    { value: 'parking lot', label: 'Parking Lot' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (error) setError('')
  }

  const validateInputs = () => {
    const lat = parseFloat(formData.latitude)
    const lon = parseFloat(formData.longitude)

    if (!formData.latitude || !formData.longitude) {
      return 'Please enter both latitude and longitude'
    }

    if (isNaN(lat) || isNaN(lon)) {
      return 'Please enter valid numbers for coordinates'
    }

    if (lat < -90 || lat > 90) {
      return 'Latitude must be between -90 and 90'
    }

    if (lon < -180 || lon > 180) {
      return 'Longitude must be between -180 and 180'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }

    const requestPayload = {
      lat: parseFloat(formData.latitude),
      lon: parseFloat(formData.longitude),
      road_type: formData.roadType,
      rainfall: 25, // Default rainfall
      drains: 'unknown' // Default drainage condition
    }

    console.log('🚀 Starting flood risk analysis with payload:', requestPayload)

    setLoading(true)
    setError('')
    setResults(null)

    try {
      console.log('📡 Sending request to /api/flood-analysis/analyze...')
      const response = await fetch('/api/flood-analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      console.log('📥 Response status:', response.status, response.statusText)
      const data = await response.json()
      console.log('📋 Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      console.log('✅ Analysis completed successfully')
      setResults(data.analysis)
    } catch (err) {
      console.error('❌ Analysis failed:', err)
      setError(err.message || 'Failed to analyze location. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-30 bg-black/20 backdrop-blur-md border-b border-white/10 p-4"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-light tracking-wide">
              <span className="text-white">Fifth Ward </span>
              <span 
                className="italic bg-gradient-to-r from-[#51A3F0] via-[#99CBF7] to-[#E0F1FF] bg-clip-text text-transparent"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Risk Analysis
              </span>
            </h1>
            <p className="text-sm text-gray-300 mt-1">Houston, Texas - Interactive Flood Risk Assessment</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="px-4 py-2 bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] text-white rounded-lg hover:from-[#4A92D9] hover:to-[#8BB9E8] transition-all duration-300 text-sm font-medium"
            >
              Back to Simulation
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Input Form */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-xl font-light mb-6 text-white">
              <span className="bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] bg-clip-text text-transparent">
                Location Analysis
              </span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Latitude Input */}
                <div>
                  <label htmlFor="latitude" className="block text-sm font-medium text-gray-300 mb-2">
                    Latitude
                  </label>
                  <input
                    type="text"
                    id="latitude"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="29.7158"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#51A3F0] focus:border-transparent transition-all duration-300"
                  />
                </div>

                {/* Longitude Input */}
                <div>
                  <label htmlFor="longitude" className="block text-sm font-medium text-gray-300 mb-2">
                    Longitude
                  </label>
                  <input
                    type="text"
                    id="longitude"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="-95.4018"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#51A3F0] focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>

              {/* Road Type Dropdown */}
              <div>
                <label htmlFor="roadType" className="block text-sm font-medium text-gray-300 mb-2">
                  Road Type
                </label>
                <select
                  id="roadType"
                  name="roadType"
                  value={formData.roadType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#51A3F0] focus:border-transparent transition-all duration-300"
                >
                  {roadTypes.map(type => (
                    <option key={type.value} value={type.value} className="bg-gray-800">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Select Houston Coordinates */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Quick Select Houston Locations
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, latitude: '29.715820777907464', longitude: '-95.40178894546409' }))}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-300"
                  >
                    Fifth Ward Houston
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, latitude: '37.7749', longitude: '-122.4194' }))}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-300"
                  >
                    San Francisco
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, latitude: '37.42033466724041', longitude: '-122.0368897987091' }))}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-300"
                  >
                    Palo Alto
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click to use pre-analyzed locations with available street view data
                </p>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] text-white rounded-lg font-medium hover:from-[#4A92D9] hover:to-[#8BB9E8] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Start Analysis</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl backdrop-blur-sm"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Results Display */}
          {results && (
            <ResultsDisplay results={results} />
          )}
        </div>
      </main>
    </div>
  )
}

// Custom CSS Pie Chart Component
function SurfaceCoveragePieChart({ data }) {
  const total = data.asphalt + data.greenery + data.other
  const asphaltPercent = (data.asphalt / total) * 100
  const greeneryPercent = (data.greenery / total) * 100
  const otherPercent = (data.other / total) * 100

  // Calculate conic-gradient for pie chart
  const asphaltEnd = asphaltPercent
  const greeneryEnd = asphaltEnd + greeneryPercent
  const otherEnd = greeneryEnd + otherPercent

  const gradientStyle = {
    background: `conic-gradient(
      #6B7280 0% ${asphaltEnd}%, 
      #10B981 ${asphaltEnd}% ${greeneryEnd}%, 
      #3B82F6 ${greeneryEnd}% ${otherEnd}%
    )`
  }

  return (
    <div className="h-64 flex items-center justify-center">
      <div className="relative">
        {/* Pie Chart Circle */}
        <div 
          className="w-40 h-40 rounded-full border-4 border-white/10"
          style={gradientStyle}
        />
        
        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-900 rounded-full border-2 border-white/20 flex items-center justify-center">
          <div className="text-xs text-gray-300 text-center">
            <div className="font-bold">100%</div>
            <div>Coverage</div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-gray-300">{data.asphalt.toFixed(1)}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">{data.greenery.toFixed(1)}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-300">{data.other.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Risk Score Progress Bar Component
function RiskScoreBar({ score, level }) {
  const getColor = () => {
    if (level === 'HIGH') return '#EF4444'
    if (level === 'MEDIUM') return '#F59E0B'
    return '#10B981'
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Risk Score</span>
        <span className="font-bold">{score.toFixed(1)}/100</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all duration-1000"
          style={{
            width: `${score}%`,
            backgroundColor: getColor()
          }}
        />
      </div>
    </div>
  )
}

// Expandable Recommendation Card Component
function RecommendationCard({ intervention, index }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      layout
      className="bg-white/5 rounded-xl border border-white/10 overflow-hidden cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <h4 className="text-lg font-medium text-white">
                {intervention.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h4>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </div>
            <p className="text-sm text-gray-300 mt-2">{intervention.impact_description}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${
            intervention.impact_severity === 'HIGH' ? 'bg-red-500/20 text-red-300' :
            intervention.impact_severity === 'MEDIUM' ? 'bg-orange-500/20 text-orange-300' :
            'bg-green-500/20 text-green-300'
          }`}>
            {intervention.impact_severity} Impact
          </div>
        </div>
        
        {/* Key Metrics - Always Visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-base font-bold text-green-400">
              ${Math.round(intervention.cost_mid / 1000)}K
            </div>
            <div className="text-xs text-gray-400">Est. Cost</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-base font-bold text-blue-400">{intervention.construction_time}</div>
            <div className="text-xs text-gray-400">Duration</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-base font-bold text-yellow-400">{intervention.flood_reduction_pct}%</div>
            <div className="text-xs text-gray-400">Reduction</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-base font-bold text-white">
              {intervention.qty_sqft ? `${intervention.qty_sqft.toLocaleString()}` :
               intervention.qty_ft ? `${intervention.qty_ft.toLocaleString()}` :
               intervention.qty_trees ? `${intervention.qty_trees}` :
               intervention.qty_inlets ? `${intervention.qty_inlets}` : 'N/A'}
            </div>
            <div className="text-xs text-gray-400">
              {intervention.qty_sqft ? 'sq ft' :
               intervention.qty_ft ? 'linear ft' :
               intervention.qty_trees ? 'trees' :
               intervention.qty_inlets ? 'inlets' : 'units'}
            </div>
          </div>
        </div>

        {/* Flood Reduction Visual */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Flood Reduction Impact</span>
            <span className="text-yellow-400 font-bold">{intervention.flood_reduction_pct}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${intervention.flood_reduction_pct}%` }}
              transition={{ duration: 1, delay: index * 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-6 pb-6 border-t border-white/10"
          >
            <div className="pt-4 space-y-4">
              <div>
                <h5 className="text-sm font-medium text-[#99CBF7] mb-2">Cost Breakdown</h5>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-green-300 font-bold">${intervention.cost_low?.toLocaleString()}</div>
                    <div className="text-gray-400 text-xs">Low Est.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-bold">${intervention.cost_mid?.toLocaleString()}</div>
                    <div className="text-gray-400 text-xs">Mid Est.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-300 font-bold">${intervention.cost_high?.toLocaleString()}</div>
                    <div className="text-gray-400 text-xs">High Est.</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-[#99CBF7] mb-2">Implementation Details</h5>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-sm text-gray-300">
                    <strong>Timeline:</strong> {intervention.construction_time}<br/>
                    <strong>Community Impact:</strong> {intervention.impact_severity} disruption expected<br/>
                    <strong>Flood Mitigation:</strong> {intervention.flood_reduction_pct}% reduction in flood risk
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ResultsDisplay({ results }) {
  console.log('🎨 Rendering results:', results)

  if (!results) {
    console.log('⚠️ No results to display')
    return null
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="space-y-8"
    >
      {/* Surface Coverage Section with Pie Chart */}
      {results.surfaces && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-medium text-[#99CBF7] mb-6 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Surface Coverage Analysis
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SurfaceCoveragePieChart data={results.surfaces} />
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4 flex items-center space-x-4">
                <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-white">{results.surfaces.asphalt?.toFixed(1)}%</div>
                  <div className="text-sm text-gray-300">Asphalt & Impermeable Surfaces</div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 flex items-center space-x-4">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-green-400">{results.surfaces.greenery?.toFixed(1)}%</div>
                  <div className="text-sm text-gray-300">Vegetation & Natural Drainage</div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 flex items-center space-x-4">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-blue-400">{results.surfaces.other?.toFixed(1)}%</div>
                  <div className="text-sm text-gray-300">Other Surfaces & Structures</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Terrain Analysis */}
      {(results.elevation_m || results.slope_pct) && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-medium text-[#99CBF7] mb-6 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            Terrain Characteristics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center space-x-3 mb-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                <span className="text-blue-300 font-medium">Elevation</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{results.elevation_m?.toFixed(1)}m</div>
              <div className="text-sm text-gray-300">Above sea level</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/20">
              <div className="flex items-center space-x-3 mb-3">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-yellow-300 font-medium">Slope</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{results.slope_pct?.toFixed(2)}%</div>
              <div className="text-sm text-gray-300">Terrain gradient</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Flood Risk Assessment */}
      {results.risk && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-medium text-[#99CBF7] mb-6 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            Flood Risk Assessment
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-lg text-gray-300">Risk Level</span>
              <span className={`px-4 py-2 rounded-full text-lg font-bold ${
                results.risk.level === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                results.risk.level === 'MEDIUM' ? 'bg-orange-500/20 text-orange-300' :
                'bg-green-500/20 text-green-300'
              }`}>
                {results.risk.level}
              </span>
            </div>
            <RiskScoreBar score={results.risk.score} level={results.risk.level} />
          </div>
        </motion.div>
      )}

      {/* Mitigation Recommendations */}
      {results.recommendation?.interventions && results.recommendation.interventions.length > 0 && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-medium text-[#99CBF7] mb-6 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            Mitigation Recommendations
          </h3>
          <div className="space-y-4">
            {results.recommendation.interventions.map((intervention, index) => (
              <RecommendationCard key={index} intervention={intervention} index={index} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Enhanced Summary */}
      {results.recommendation && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-[#51A3F0]/20 to-[#99CBF7]/20 border-2 border-[#51A3F0]/30 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold text-[#E0F1FF] mb-6 flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] rounded-full flex items-center justify-center mr-4">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            Project Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {results.recommendation.total_cost && (
              <div className="text-center bg-white/10 rounded-xl p-4">
                <div className="text-3xl font-bold text-green-400 mb-1">
                  ${Math.round(results.recommendation.total_cost.mid / 1000)}K
                </div>
                <div className="text-sm text-gray-300">Estimated Cost</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${Math.round(results.recommendation.total_cost.low / 1000)}K - ${Math.round(results.recommendation.total_cost.high / 1000)}K range
                </div>
              </div>
            )}
            {results.recommendation.total_duration && (
              <div className="text-center bg-white/10 rounded-xl p-4">
                <div className="text-3xl font-bold text-blue-400 mb-1">{results.recommendation.total_duration}</div>
                <div className="text-sm text-gray-300">Total Duration</div>
              </div>
            )}
            {results.recommendation.total_flood_reduction_pct && (
              <div className="text-center bg-white/10 rounded-xl p-4">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{results.recommendation.total_flood_reduction_pct}%</div>
                <div className="text-sm text-gray-300">Flood Reduction</div>
              </div>
            )}
            {results.recommendation.interventions && (
              <div className="text-center bg-white/10 rounded-xl p-4">
                <div className="text-3xl font-bold text-purple-400 mb-1">{results.recommendation.interventions.length}</div>
                <div className="text-sm text-gray-300">Interventions</div>
              </div>
            )}
          </div>
          {results.recommendation.community_summary && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-bold text-[#99CBF7] mb-3">Community Impact Assessment</h4>
              <p className="text-gray-300 leading-relaxed">{results.recommendation.community_summary}</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

export default RiskAnalysis
