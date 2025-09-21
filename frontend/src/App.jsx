import { useState } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { selectRainfall, selectDuration, selectLoading, selectError, selectResults, selectStatistics } from './store/slices/simulationSlice'
import FloodMap from './components/Map/FloodMap'
import RainfallSlider from './components/Controls/RainfallSlider'
import DurationSlider from './components/Controls/DurationSlider'
import SimulationButton from './components/Controls/SimulationButton'
import LandingPage from './components/Hero/LandingPage'
import ThemeToggle from './components/ThemeToggle'

function App() {
  const [showLandingPage, setShowLandingPage] = useState(true)
  const rainfall = useSelector(selectRainfall)
  const duration = useSelector(selectDuration)
  const loading = useSelector(selectLoading)
  const error = useSelector(selectError)
  const results = useSelector(selectResults)
  const statistics = useSelector(selectStatistics)

  // Handle entering the main application from hero screen
  const handleEnterApp = () => {
    setShowLandingPage(false)
  }

  // Show landing page first
  if (showLandingPage) {
    return <LandingPage onEnterApp={handleEnterApp} />
  }

  return (
    <AppContent 
      rainfall={rainfall}
      duration={duration}
      loading={loading}
      error={error}
      results={results}
      statistics={statistics}
    />
  )
}

const AppContent = ({ rainfall, duration, loading, error, results, statistics }) => {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 dark:from-gray-900 dark:via-black dark:to-gray-800 text-white overflow-hidden flex flex-col">
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
                Storm
              </span>
            </h1>
            <p className="text-sm text-gray-300 mt-1">Houston, Texas - Interactive Flood Risk Assessment</p>
          </div>
          
          <ThemeToggle />
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 flex relative min-h-0">
        {/* Map Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="flex-1 relative min-h-0"
        >
          <FloodMap />
          
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10 pointer-events-none z-0" />
        </motion.div>

        {/* Control Panel */}
        <motion.aside 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 overflow-y-auto flex-shrink-0"
        >
          <div className="p-6">
            <h2 className="text-xl font-light mb-8 text-white">
              <span className="bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] bg-clip-text text-transparent">
                Simulation Controls
              </span>
            </h2>

            {error && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl backdrop-blur-sm"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </motion.div>
            )}

            <div className="space-y-8">
              <RainfallSlider />
              <DurationSlider />
              <SimulationButton />
            </div>

            {/* Current Parameters */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 p-6 bg-gradient-to-br from-[#51A3F0]/10 to-[#99CBF7]/10 rounded-xl border border-white/10 backdrop-blur-sm"
            >
              <h3 className="text-sm font-medium text-[#99CBF7] mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Current Parameters
              </h3>
              <p className="text-sm text-gray-300">
                {rainfall.toFixed(1)}" of rain over {duration} hour{duration === 1 ? '' : 's'}
              </p>
            </motion.div>

            {/* Simulation Results */}
            {results && statistics && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 p-6 bg-gradient-to-br from-[#99CBF7]/10 to-[#E0F1FF]/10 rounded-xl border border-white/10 backdrop-blur-sm"
              >
                <h3 className="text-sm font-medium text-[#E0F1FF] mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Simulation Results
                </h3>
                <div className="text-sm text-gray-300 space-y-2">
                  <div className="flex justify-between">
                    <span>Risk Markers:</span>
                    <span className="text-[#99CBF7] font-medium">{results.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Risk:</span>
                    <span className="text-red-400 font-medium">{statistics.high}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moderate Risk:</span>
                    <span className="text-yellow-400 font-medium">{statistics.moderate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Risk:</span>
                    <span className="text-green-400 font-medium">{statistics.low}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.aside>
      </main>
    </div>
  )
}

export default App
