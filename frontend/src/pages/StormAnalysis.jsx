import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import ThemeToggle from '../components/ThemeToggle'

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
          <h3 className="text-red-400 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-300 text-sm">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Step definitions
const STEPS = [
  { id: 1, name: 'Input/Acquisition', description: 'Coordinate input and data fetching' },
  { id: 2, name: 'Segmentation', description: 'AI image analysis and surface detection' },
  { id: 3, name: 'Surface Coverage', description: 'Surface type classification and percentages' },
  { id: 4, name: 'Terrain', description: 'Elevation and slope analysis' },
  { id: 5, name: 'Flood Risk & Actions', description: 'Risk assessment and mitigation recommendations' }
]

function StormAnalysis() {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    roadType: 'residential street'
  })
  const [activeStep, setActiveStep] = useState(1)
  const [stepStatus, setStepStatus] = useState({
    1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'idle'
  })
  const [results, setResults] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [cityName, setCityName] = useState('')
  const svgRef = useRef(null)
  const pathRef = useRef(null)

  const roadTypes = [
    { value: 'residential street', label: 'Residential Street' },
    { value: 'highway lane', label: 'Highway Lane' },
    { value: 'interstate section', label: 'Interstate Section' },
    { value: 'sidewalk', label: 'Sidewalk' },
    { value: 'parking lot', label: 'Parking Lot' }
  ]

  // Lightning bolt path coordinates
  const lightningPath = "M150,50 L140,120 L160,150 L130,220 L150,280 L120,350 L140,420 L110,480"

  // Get step status class
  const getStepStatusClass = (step) => {
    const status = stepStatus[step]
    return `storm-dot storm-dot--${status}`
  }

  // Calculate dot positions along lightning path
  const getDotPosition = (stepIndex) => {
    if (!pathRef.current) return { x: 0, y: 0 }
    
    const path = pathRef.current
    const totalLength = path.getTotalLength()
    const positions = [0.05, 0.25, 0.5, 0.7, 0.9] // Percentages along path
    const point = path.getPointAtLength(totalLength * positions[stepIndex])
    return { x: point.x, y: point.y }
  }

  // Handle coordinate input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  // Quick select coordinates
  const selectCoordinates = (lat, lon, city = '') => {
    setFormData(prev => ({ ...prev, latitude: lat.toString(), longitude: lon.toString() }))
    setCityName(city)
    setError('')
  }

  // Validate inputs
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

  // Simulate step progression with timing
  const simulateStepProgress = async (callback) => {
    const stepTimings = [500, 1200, 800, 600, 1000] // ms for each step
    
    for (let i = 0; i < STEPS.length; i++) {
      const stepId = STEPS[i].id
      
      // Set step to running
      setStepStatus(prev => ({ ...prev, [stepId]: 'running' }))
      setActiveStep(stepId)
      
      // Wait for step timing
      await new Promise(resolve => setTimeout(resolve, stepTimings[i]))
      
      // Set step to done (or error if callback fails)
      try {
        const stepResult = await callback(stepId)
        if (stepResult) {
          setStepStatus(prev => ({ ...prev, [stepId]: 'done' }))
        }
      } catch (err) {
        setStepStatus(prev => ({ ...prev, [stepId]: 'error' }))
        throw err
      }
    }
  }

  // Handle analysis submission
  const handleRunAnalysis = async () => {
    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsAnalyzing(true)
    setError('')
    setResults(null)
    
    // Reset all steps
    setStepStatus({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle', 5: 'idle' })
    setActiveStep(1)

    const requestPayload = {
      lat: parseFloat(formData.latitude),
      lon: parseFloat(formData.longitude),
      road_type: formData.roadType,
      rainfall: 25,
      drains: 'unknown'
    }

    console.log('⚡ Starting storm analysis with payload:', requestPayload)

    try {
      await simulateStepProgress(async (stepId) => {
        if (stepId === 5) {
          // Actually call the API on the final step
          console.log('📡 Calling flood analysis API...')
          const response = await fetch('http://localhost:3001/api/flood-analysis/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
          })

          const data = await response.json()
          console.log('📥 API Response:', data)

          if (!response.ok) {
            throw new Error(data.error || 'Analysis failed')
          }

          setResults(data.analysis)
          // CRITICAL: Set isAnalyzing to false immediately when results are received
          setIsAnalyzing(false)
          return true
        }
        return true
      })

      console.log('✅ Storm analysis completed successfully')
    } catch (err) {
      console.error('❌ Storm analysis failed:', err)
      setError(err.message || 'Analysis failed. Please try again.')
      setIsAnalyzing(false)
    }
  }

  // Handle step navigation
  const handleStepClick = (stepId) => {
    setActiveStep(stepId)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && activeStep > 1) {
        setActiveStep(activeStep - 1)
      } else if (e.key === 'ArrowRight' && activeStep < STEPS.length) {
        setActiveStep(activeStep + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeStep])

  return (
    <div className="h-screen w-screen storm-background text-white overflow-hidden flex flex-col">
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
                className="italic bg-gradient-to-r from-[#7dd3ff] via-[#60a5fa] to-[#93c5fd] bg-clip-text text-transparent"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Storm
              </span>
            </h1>
            <div className="text-sm text-gray-300 mt-1 flex items-center space-x-4">
              <span>Houston, Texas - Lightning Flow Analysis</span>
              {formData.latitude && formData.longitude && (
                <span className="text-[#7dd3ff]">
                  {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
                  {cityName && ` • ${cityName}`}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <motion.button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !formData.latitude || !formData.longitude}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gradient-to-r from-[#7dd3ff] to-[#60a5fa] text-gray-900 rounded-lg font-bold hover:from-[#60a5fa] hover:to-[#7dd3ff] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 storm-spinner"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Run Analysis</span>
                </>
              )}
            </motion.button>
            <Link 
              to="/" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-all duration-300"
            >
              Back to Simulation
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Lightning Bolt Side */}
        <div className="w-full h-[40vh] lg:h-full lg:flex-none lg:w-1/2 xl:w-2/5 flex items-center justify-center p-4 lg:p-8">
          <LightningFlow 
            steps={STEPS}
            activeStep={activeStep}
            stepStatus={stepStatus}
            onStepClick={handleStepClick}
            lightningPath={lightningPath}
            svgRef={svgRef}
            pathRef={pathRef}
            getDotPosition={getDotPosition}
          />
        </div>

        {/* Content Panel Side */}
        <div className="flex-1 lg:w-1/2 xl:w-3/5 bg-black/30 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto">
          <ErrorBoundary>
            <ContentPanel 
              activeStep={activeStep}
              stepStatus={stepStatus}
              formData={formData}
              onInputChange={handleInputChange}
              onSelectCoordinates={selectCoordinates}
              roadTypes={roadTypes}
              results={results}
              error={error}
              cityName={cityName}
              isAnalyzing={isAnalyzing}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

// Lightning Flow Component
function LightningFlow({ 
  steps, 
  activeStep, 
  stepStatus, 
  onStepClick, 
  lightningPath, 
  svgRef, 
  pathRef,
  getDotPosition 
}) {
  const [pathLength, setPathLength] = useState(0)
  const [showBolt, setShowBolt] = useState(false)

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength()
      setPathLength(length)
      
      // Trigger bolt animation after a short delay
      setTimeout(() => setShowBolt(true), 300)
    }
  }, [])

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg
        ref={svgRef}
        width="300"
        height="600"
        viewBox="0 0 300 600"
        className="w-full h-full"
      >
        <defs>
          {/* Lightning gradient */}
          <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3ff" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="lightningGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Lightning bolt path */}
        <motion.path
          ref={pathRef}
          d={lightningPath}
          className="lightning-bolt"
          stroke="url(#lightningGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lightningGlow)"
          initial={{ 
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength 
          }}
          animate={{ 
            strokeDashoffset: showBolt ? 0 : pathLength 
          }}
          transition={{ 
            duration: 0.6, 
            ease: "easeInOut" 
          }}
        />

        {/* Interactive dots */}
        {steps.map((step, index) => {
          const position = getDotPosition(index)
          const isActive = activeStep === step.id
          const status = stepStatus[step.id]
          
          return (
            <g key={step.id}>
              {/* Interactive area for better touch targets */}
              <circle
                cx={position.x}
                cy={position.y}
                r="20"
                fill="transparent"
                onClick={() => onStepClick(step.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onStepClick(step.id)
                  }
                }}
                style={{ cursor: 'pointer' }}
                tabIndex={0}
                role="button"
                aria-label={`Step ${step.id}: ${step.name}. Status: ${status}. ${isActive ? 'Currently active.' : 'Click to view.'}`}
                aria-pressed={isActive}
              />
              
              {/* Dot */}
              <circle
                cx={position.x}
                cy={position.y}
                r="12"
                className={getStepStatusClass(step.id)}
                style={{ pointerEvents: 'none' }}
              />
              
              {/* Step number */}
              <text
                x={position.x}
                y={position.y + 5}
                textAnchor="middle"
                className="text-xs font-bold fill-white pointer-events-none"
                aria-hidden="true"
              >
                {step.id}
              </text>
              
              {/* Step label */}
              <text
                x={position.x + 20}
                y={position.y + 5}
                className={`text-sm font-medium pointer-events-none ${
                  isActive ? 'fill-[#7dd3ff]' : 'fill-gray-300'
                }`}
                aria-hidden="true"
              >
                {step.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )

  function getStepStatusClass(stepId) {
    const status = stepStatus[stepId]
    return `storm-dot storm-dot--${status}`
  }
}

// Content Panel Component
function ContentPanel({ 
  activeStep, 
  stepStatus, 
  formData, 
  onInputChange, 
  onSelectCoordinates, 
  roadTypes, 
  results, 
  error,
  cityName,
  isAnalyzing 
}) {
  return (
    <div className="p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeStep === 1 && (
            <Step1InputAcquisition 
              formData={formData}
              onInputChange={onInputChange}
              onSelectCoordinates={onSelectCoordinates}
              roadTypes={roadTypes}
              error={error}
              cityName={cityName}
            />
          )}
          {activeStep === 2 && <Step2Segmentation results={results} isAnalyzing={isAnalyzing} />}
          {activeStep === 3 && <Step3SurfaceCoverage results={results} />}
          {activeStep === 4 && <Step4Terrain results={results} />}
          {activeStep === 5 && <Step5FloodRisk results={results} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Step 1: Input/Acquisition
function Step1InputAcquisition({ formData, onInputChange, onSelectCoordinates, roadTypes, error, cityName }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">Input & Data Acquisition</h2>
        <p className="text-gray-300">Enter coordinates to begin the lightning-fast analysis</p>
      </div>

      {/* Coordinate Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Latitude</label>
          <input
            type="text"
            name="latitude"
            value={formData.latitude}
            onChange={onInputChange}
            placeholder="29.7158"
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7dd3ff] focus:border-transparent transition-all duration-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Longitude</label>
          <input
            type="text"
            name="longitude"
            value={formData.longitude}
            onChange={onInputChange}
            placeholder="-95.4018"
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7dd3ff] focus:border-transparent transition-all duration-300"
          />
        </div>
      </div>

      {/* Road Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Road Type</label>
        <select
          name="roadType"
          value={formData.roadType}
          onChange={onInputChange}
          className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#7dd3ff] focus:border-transparent transition-all duration-300"
        >
          {roadTypes.map(type => (
            <option key={type.value} value={type.value} className="bg-gray-800">
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Select */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Quick Select Locations</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectCoordinates(29.715820777907464, -95.40178894546409, 'Fifth Ward, Houston')}
            className="px-3 py-2 bg-white/10 hover:bg-[#7dd3ff]/20 border border-white/20 hover:border-[#7dd3ff]/50 rounded-lg text-sm text-gray-300 hover:text-[#7dd3ff] transition-all duration-300"
          >
            ⚡ Fifth Ward Houston
          </button>
          <button
            onClick={() => onSelectCoordinates(37.7749, -122.4194, 'San Francisco')}
            className="px-3 py-2 bg-white/10 hover:bg-[#7dd3ff]/20 border border-white/20 hover:border-[#7dd3ff]/50 rounded-lg text-sm text-gray-300 hover:text-[#7dd3ff] transition-all duration-300"
          >
            🌉 San Francisco
          </button>
          <button
            onClick={() => onSelectCoordinates(37.42033466724041, -122.0368897987091, 'Palo Alto')}
            className="px-3 py-2 bg-white/10 hover:bg-[#7dd3ff]/20 border border-white/20 hover:border-[#7dd3ff]/50 rounded-lg text-sm text-gray-300 hover:text-[#7dd3ff] transition-all duration-300"
          >
            🏢 Palo Alto
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Status */}
      {formData.latitude && formData.longitude && (
        <div className="p-4 bg-[#7dd3ff]/10 border border-[#7dd3ff]/30 rounded-xl">
          <h3 className="text-[#7dd3ff] font-medium mb-2">Ready for Analysis</h3>
          <p className="text-gray-300 text-sm">
            Coordinates: {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
            {cityName && ` • ${cityName}`}
          </p>
          <p className="text-gray-300 text-sm">Road Type: {roadTypes.find(t => t.value === formData.roadType)?.label}</p>
        </div>
      )}
    </div>
  )
}

// Image Card Component for Segmentation Display
function ImageCard({ 
  angle, 
  filename, 
  imageUrl, 
  isLoading, 
  hasError, 
  isLoaded, 
  onImageLoad, 
  onImageError, 
  hoveredImage, 
  setHoveredImage 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: angle / 100 }}
      className="group bg-white/5 rounded-xl p-4 border border-white/10 hover:border-[#7dd3ff]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#7dd3ff]/10"
      onMouseEnter={() => setHoveredImage(angle)}
      onMouseLeave={() => setHoveredImage(null)}
    >
      <div className="aspect-video bg-gray-700/50 rounded-lg mb-3 overflow-hidden relative shadow-inner">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-6 h-6 storm-spinner"></div>
              <span className="text-gray-400 text-xs">Loading...</span>
            </div>
          </div>
        ) : hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
            <div className="text-center p-3">
              <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 6.5c-.77.833-.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-400 text-xs">Not available</span>
            </div>
          </div>
        ) : imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`AI Segmented view ${angle}° - Surface types highlighted with colored overlay`}
              className={`w-full h-full object-cover rounded-lg shadow-lg transition-all duration-300 ${
                hoveredImage === angle ? 'scale-105' : 'scale-100'
              }`}
              onLoad={() => onImageLoad && onImageLoad(filename)}
              onError={() => onImageError && onImageError(filename)}
            />
            {/* Zoom indicator on hover */}
            {hoveredImage === angle && (
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/30">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-600/50 rounded-lg flex items-center justify-center mb-2 mx-auto">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-gray-400 text-sm">View {angle}°</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-300">
          Direction: {angle}°
        </div>
        <div className="flex items-center space-x-1">
          {hasError ? (
            <>
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-xs text-red-400">Error</span>
            </>
          ) : isLoaded ? (
            <>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-green-400">Ready</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-xs text-yellow-400">Loading</span>
            </>
          )}
        </div>
      </div>
      
      {/* Surface legend */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span className="text-gray-400">Asphalt</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Vegetation</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-400">Other</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}


// Step 2: Segmentation
function Step2Segmentation({ results, isAnalyzing }) {
  const [imageLoadStates, setImageLoadStates] = useState({})
  const [imageErrors, setImageErrors] = useState({})
  const [hoveredImage, setHoveredImage] = useState(null)

  const handleImageLoad = (filename) => {
    console.log('✅ Image loaded successfully:', filename)
    setImageLoadStates(prev => ({ ...prev, [filename]: 'loaded' }))
  }

  const handleImageError = (filename) => {
    setImageErrors(prev => ({ ...prev, [filename]: true }))
    setImageLoadStates(prev => ({ ...prev, [filename]: 'error' }))
    console.error(`❌ Failed to load segmentation image: ${filename}`)
    console.error(`❌ Check if backend is running on http://localhost:3001`)
    console.error(`❌ Check if image exists at the constructed URL`)
  }

  // Check if we have the new format (segmentation_folder and images array)
  const hasNewFormat = results?.segmentation_folder && results?.images && results.images.length > 0
  // Fallback to old format for backward compatibility
  const hasLegacyFormat = results?.segmentation_images && Object.keys(results.segmentation_images).length > 0
  const hasSegmentationImages = hasNewFormat || hasLegacyFormat

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">AI Segmentation</h2>
        <p className="text-gray-300">Street View image analysis using Mask2Former with surface overlay</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {hasNewFormat ? (
          // Use new format: iterate through images array
          results.images.map(filename => {
            const angle = filename.split('.')[0] // Extract angle from filename (e.g., "0.jpg" -> "0")
            const imageUrl = `http://localhost:3001${results.segmentation_folder}${filename}`
            console.log('🔍 Debug - Image URL:', imageUrl)
            console.log('🔍 Debug - segmentation_folder:', results.segmentation_folder)
            console.log('🔍 Debug - filename:', filename)
            
            // FIXED: Only show loading state if we're analyzing AND haven't loaded the image yet
            const isLoading = isAnalyzing && !imageLoadStates[filename] && !imageErrors[filename]
            const hasError = imageErrors[filename]
            const isLoaded = imageLoadStates[filename] === 'loaded'
            console.log('🔍 Debug - Loading states:', { isLoading, hasError, isLoaded, imageLoadStates: imageLoadStates[filename] })
            
            return (
              <ImageCard 
                key={filename}
                angle={parseInt(angle)}
                filename={filename}
                imageUrl={imageUrl}
                isLoading={isLoading}
                hasError={hasError}
                isLoaded={isLoaded}
                onImageLoad={handleImageLoad}
                onImageError={handleImageError}
                hoveredImage={hoveredImage}
                setHoveredImage={setHoveredImage}
              />
            )
          })
        ) : hasLegacyFormat ? (
          // Fallback to old format for backward compatibility
          [0, 90, 180, 270].map(angle => {
            const angleStr = angle.toString()
            const imageUrl = `http://localhost:3001${results.segmentation_images[angleStr]}`
            const isLoading = isAnalyzing && !imageLoadStates[angleStr] && !imageErrors[angleStr]
            const hasError = imageErrors[angleStr]
            const isLoaded = imageLoadStates[angleStr] === 'loaded'
            
            return (
              <ImageCard 
                key={angle}
                angle={angle}
                filename={`${angle}.jpg`}
                imageUrl={imageUrl}
                isLoading={isLoading}
                hasError={hasError}
                isLoaded={isLoaded}
                onImageLoad={() => handleImageLoad(angleStr)}
                onImageError={() => handleImageError(angleStr)}
                hoveredImage={hoveredImage}
                setHoveredImage={setHoveredImage}
              />
            )
          })
        ) : (
          // Show placeholders when no results yet
          [0, 90, 180, 270].map(angle => (
            <ImageCard 
              key={angle}
              angle={angle}
              filename={`${angle}.jpg`}
              imageUrl={null}
              isLoading={isAnalyzing}
              hasError={false}
              isLoaded={false}
              onImageLoad={handleImageLoad}
              onImageError={handleImageError}
              hoveredImage={hoveredImage}
              setHoveredImage={setHoveredImage}
            />
          ))
        )}
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-300 text-sm">
              {isAnalyzing ? (
                "🔍 Processing street view images with AI-powered segmentation to identify surface types..."
              ) : hasSegmentationImages ? (
                hasNewFormat ? 
                  `✅ Segmentation complete — ${results.images.length} segmented images saved with AI surface analysis highlighting vegetation (green), asphalt (gray), and other structures (blue).` :
                  "✅ Segmentation complete — AI has analyzed surfaces and highlighted vegetation (green), asphalt (gray), and other structures (blue)."
              ) : (
                "⏳ Segmentation will be processed during analysis to identify flood-relevant surface types..."
              )}
            </p>
            {hasSegmentationImages && (
              <p className="text-blue-300/70 text-xs mt-1">
                Hover over images to zoom. Surface types are color-coded for easy identification.
                {hasNewFormat && ` Results saved to: ${results.segmentation_folder}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 3: Surface Coverage with Enhanced Charts
function Step3SurfaceCoverage({ results }) {
  if (!results?.surfaces) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">Surface Coverage</h2>
          <p className="text-gray-300">Analyzing surface types and percentages</p>
        </div>
        <div className="p-8 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 storm-spinner mx-auto mb-4"></div>
            <span className="text-gray-400">Processing with Mask2Former AI...</span>
          </div>
        </div>
      </div>
    )
  }

  const chartData = [
    { name: 'Asphalt', value: results.surfaces.asphalt, color: '#6B7280', label: 'Impermeable Surfaces' },
    { name: 'Greenery', value: results.surfaces.greenery, color: '#10B981', label: 'Vegetation & Drainage' },
    { name: 'Other', value: results.surfaces.other, color: '#3B82F6', label: 'Structures & Mixed' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">Surface Coverage Analysis</h2>
        <p className="text-gray-300">AI-powered surface segmentation results using Mask2Former</p>
      </div>

      {/* Donut Chart */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Surface Type Distribution</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className="font-medium text-white">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{item.value.toFixed(1)}%</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Insights */}
      <div className="bg-[#7dd3ff]/10 border border-[#7dd3ff]/30 rounded-xl p-4">
        <h4 className="text-[#7dd3ff] font-semibold mb-2">💡 Analysis Insights</h4>
        <div className="text-sm text-gray-300 space-y-1">
          <p>• {results.surfaces.asphalt > 50 ? 'High' : results.surfaces.asphalt > 30 ? 'Moderate' : 'Low'} impermeable surface coverage detected</p>
          <p>• Vegetation coverage: {results.surfaces.greenery > 40 ? 'Excellent' : results.surfaces.greenery > 25 ? 'Good' : 'Limited'} natural drainage potential</p>
          <p>• Surface analysis completed using computer vision on 4-directional street view imagery</p>
        </div>
      </div>
    </div>
  )
}

// Step 4: Terrain (placeholder for now)
function Step4Terrain({ results }) {
  if (!results) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">Terrain Analysis</h2>
          <p className="text-gray-300">Elevation and slope characteristics</p>
        </div>
        <div className="p-8 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
          <span className="text-gray-400">Awaiting analysis results...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">Terrain Analysis</h2>
        <p className="text-gray-300">Topographical characteristics</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-500/20 rounded-lg p-6">
          <div className="text-3xl font-bold text-white">{results.elevation_m?.toFixed(1)}m</div>
          <div className="text-sm text-gray-300">Elevation</div>
        </div>
        <div className="bg-yellow-500/20 rounded-lg p-6">
          <div className="text-3xl font-bold text-white">{results.slope_pct?.toFixed(2)}%</div>
          <div className="text-sm text-gray-300">Slope</div>
        </div>
      </div>
    </div>
  )
}

// Step 5: Flood Risk & Actions with Enhanced UI
function Step5FloodRisk({ results }) {
  if (!results) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">Flood Risk & Actions</h2>
          <p className="text-gray-300">Risk assessment and mitigation strategies</p>
        </div>
        <div className="p-8 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 storm-spinner mx-auto mb-4"></div>
            <span className="text-gray-400">Calculating flood risk and generating recommendations...</span>
          </div>
        </div>
      </div>
    )
  }

  const getRiskColor = (level) => {
    switch(level) {
      case 'HIGH': return '#ef4444'
      case 'MEDIUM': return '#f59e0b'
      case 'LOW': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#7dd3ff] mb-2">Flood Risk & Mitigation Strategy</h2>
        <p className="text-gray-300">Comprehensive risk assessment with actionable interventions</p>
      </div>

      {/* Risk Gauge */}
      {results.risk && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🎯 Risk Assessment</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Flood Risk Score</span>
              <span className="text-2xl font-bold text-white">{results.risk.score?.toFixed(1)}/100</span>
            </div>
            
            {/* Risk Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Risk Level</span>
                <span className={`font-bold px-2 py-1 rounded text-xs ${
                  results.risk.level === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                  results.risk.level === 'MEDIUM' ? 'bg-orange-500/20 text-orange-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {results.risk.level}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <motion.div
                  className="h-3 rounded-full transition-all duration-1000"
                  style={{
                    width: `${results.risk.score}%`,
                    backgroundColor: getRiskColor(results.risk.level)
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${results.risk.score}%` }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intervention Cards */}
      {results.recommendation?.interventions && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">🛠️ Recommended Interventions</h3>
          {results.recommendation.interventions.map((intervention, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#7dd3ff] to-[#60a5fa] rounded-full flex items-center justify-center text-gray-900 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      {intervention.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-400">{intervention.impact_description}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  intervention.impact_severity === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                  intervention.impact_severity === 'MEDIUM' ? 'bg-orange-500/20 text-orange-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {intervention.impact_severity}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-400">
                    ${Math.round(intervention.cost_mid / 1000)}K
                  </div>
                  <div className="text-xs text-gray-400">Cost</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">{intervention.construction_time}</div>
                  <div className="text-xs text-gray-400">Duration</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-yellow-400">{intervention.flood_reduction_pct}%</div>
                  <div className="text-xs text-gray-400">Reduction</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-white">
                    {intervention.qty_sqft ? `${intervention.qty_sqft.toLocaleString()}` :
                     intervention.qty_ft ? `${intervention.qty_ft.toLocaleString()}` :
                     intervention.qty_trees ? `${intervention.qty_trees}` :
                     intervention.qty_inlets ? `${intervention.qty_inlets}` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {intervention.qty_sqft ? 'sq ft' :
                     intervention.qty_ft ? 'ft' :
                     intervention.qty_trees ? 'trees' :
                     intervention.qty_inlets ? 'inlets' : 'units'}
                  </div>
                </div>
              </div>

              {/* Flood Reduction Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Flood Reduction Impact</span>
                  <span className="text-yellow-400 font-bold">{intervention.flood_reduction_pct}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-green-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${intervention.flood_reduction_pct}%` }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.2 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Project Totals */}
      {results.recommendation && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="bg-gradient-to-br from-[#7dd3ff]/20 to-[#60a5fa]/20 border-2 border-[#7dd3ff]/30 rounded-xl p-6"
        >
          <h3 className="text-xl font-bold text-[#7dd3ff] mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Project Summary & Impact
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                ${Math.round(results.recommendation.total_cost?.mid / 1000)}K
              </div>
              <div className="text-sm text-gray-300">Total Cost</div>
              <div className="text-xs text-gray-400 mt-1">
                ${Math.round(results.recommendation.total_cost?.low / 1000)}K - ${Math.round(results.recommendation.total_cost?.high / 1000)}K
              </div>
            </div>
            <div className="text-center bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{results.recommendation.total_duration}</div>
              <div className="text-sm text-gray-300">Duration</div>
            </div>
            <div className="text-center bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{results.recommendation.total_flood_reduction_pct}%</div>
              <div className="text-sm text-gray-300">Flood Reduction</div>
            </div>
            <div className="text-center bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{results.recommendation.interventions?.length || 0}</div>
              <div className="text-sm text-gray-300">Interventions</div>
            </div>
          </div>

          {results.recommendation.community_summary && (
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-[#7dd3ff] font-semibold mb-2">🏘️ Community Impact</h4>
              <p className="text-gray-300 text-sm leading-relaxed">{results.recommendation.community_summary}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default StormAnalysis
