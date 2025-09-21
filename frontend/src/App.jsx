import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { selectRainfall, selectDuration, selectLoading, selectError, selectResults, selectStatistics } from './store/slices/simulationSlice'
import FloodMap from './components/Map/FloodMap'
import RainfallSlider from './components/Controls/RainfallSlider'
import DurationSlider from './components/Controls/DurationSlider'
import SimulationButton from './components/Controls/SimulationButton'
import ClearResultsButton from './components/Controls/ClearResultsButton'
import LandingPage from './components/Hero/LandingPage'
import ThemeToggle from './components/ThemeToggle'
import RiskAnalysis from './pages/RiskAnalysis'
import StormAnalysis from './pages/StormAnalysis'
import { LocationProvider, useLocation } from './contexts/LocationContext'

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
    <LocationProvider>
      <Routes>
        <Route path="/" element={
          <AppContent 
            rainfall={rainfall}
            duration={duration}
            loading={loading}
            error={error}
            results={results}
            statistics={statistics}
          />
        } />
        <Route path="/analysis" element={<RiskAnalysis />} />
        <Route path="/analysis-storm" element={<StormAnalysis />} />
      </Routes>
    </LocationProvider>
  )
}

const AppContent = ({ rainfall, duration, loading, error, results, statistics }) => {
  // Initialize both states based on screen size consistently
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })
  
  const { currentLocation, isLoading: locationLoading } = useLocation()

  // Check if device is mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)
      // Only auto-collapse on mobile if not already set correctly
      if (isMobileDevice && !isCollapsed) {
        setIsCollapsed(true)
      }
    }

    // Only run resize listener, don't call checkMobile() on mount since state is already initialized correctly
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 dark:from-gray-900 dark:via-black dark:to-gray-800 light:from-gray-50 light:via-white light:to-gray-100 text-white dark:text-white light:text-gray-900 overflow-hidden flex flex-col">
      {/* Header - Always on top with highest z-index */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed top-0 left-0 w-full z-[60] bg-black dark:bg-black light:bg-white border-b border-white/10 dark:border-white/10 light:border-gray-200 p-4"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-light tracking-wide flex items-center">
              <svg 
                className="w-6 h-6 mr-2 text-[#51A3F0] dark:text-[#51A3F0] light:text-[#51A3F0]" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1.05L13 10h3.5c.49 0 .56.75.47.8C15.49 13.06 13.51 16.46 11 21z"/>
              </svg>
              <span 
                className="italic bg-gradient-to-r from-[#51A3F0] via-[#99CBF7] to-[#E0F1FF] bg-clip-text text-transparent"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Storm
              </span>
            </h1>
            <motion.div 
              className="text-sm text-gray-300 dark:text-gray-300 light:text-gray-600 mt-1"
              key={currentLocation.fullName}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {locationLoading ? (
                <span className="flex items-center">
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Detecting location...
                </span>
              ) : (
                `${currentLocation.fullName} - Interactive Flood Risk Assessment`
              )}
            </motion.div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link 
              to="/analysis-storm" 
              className="px-4 py-2 bg-gradient-to-r from-[#7dd3ff] to-[#60a5fa] dark:from-[#7dd3ff] dark:to-[#60a5fa] light:from-[#7dd3ff] light:to-[#60a5fa] text-gray-900 dark:text-gray-900 light:text-gray-900 rounded-lg hover:from-[#60a5fa] hover:to-[#7dd3ff] dark:hover:from-[#60a5fa] dark:hover:to-[#7dd3ff] light:hover:from-[#60a5fa] light:hover:to-[#7dd3ff] transition-all duration-300 text-sm font-bold flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Storm Analysis</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Main Content - Account for fixed header */}
      <main className="flex-1 relative min-h-0 pt-20">
        {/* Map Area - Always Fullscreen (100vw x 100vh) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="fixed inset-0 w-screen h-screen z-0"
        >
          <FloodMap />
          
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10 pointer-events-none z-0" />
        </motion.div>

        {/* Persistent Toggle Button - Below header */}
        <motion.button
          onClick={toggleCollapse}
          className="z-50 bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] dark:from-[#51A3F0] dark:to-[#99CBF7] light:from-[#51A3F0] light:to-[#99CBF7] hover:from-[#4A96E6] hover:to-[#8BC4F5] dark:hover:from-[#4A96E6] dark:hover:to-[#8BC4F5] light:hover:from-[#4A96E6] light:hover:to-[#8BC4F5] text-white dark:text-white light:text-white shadow-lg border-0"
          style={{
            position: 'fixed',
            top: '50%',
            transform: 'translateY(-50%)',
            right: isCollapsed ? 0 : 320,
            borderRadius: isCollapsed ? '0.5rem 0 0 0.5rem' : '0 0.5rem 0.5rem 0',
            paddingLeft: '0.75rem',
            paddingRight: '0.75rem',
            paddingTop: isCollapsed ? '1rem' : '0.75rem',
            paddingBottom: isCollapsed ? '1rem' : '0.75rem'
          }}
          animate={{
            right: isCollapsed ? 0 : 320
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
            mass: 0.6
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isCollapsed ? 'Expand control panel' : 'Collapse control panel'}
        >
          <svg 
            className="w-5 h-5 transition-transform duration-150 ease-out"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
          </svg>
        </motion.button>

        {/* Control Panel - Fixed Overlay */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.aside 
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30,
                mass: 0.8
              }}
              className="fixed right-0 top-20 h-[calc(100vh-5rem)] w-80 bg-black/40 dark:bg-black/40 light:bg-white/90 backdrop-blur-xl border-l border-white/10 dark:border-white/10 light:border-gray-200 overflow-y-auto z-40"
            >
              {/* Panel Header with Collapse Button */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 dark:border-white/10 light:border-gray-200">
                <h2 className="text-xl font-light text-white dark:text-white light:text-gray-900">
                  <span className="bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] bg-clip-text text-transparent">
                    Simulation Controls
                  </span>
                </h2>
                <button
                  onClick={toggleCollapse}
                  className="lg:hidden p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-200 transition-colors"
                  aria-label="Close control panel"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 pt-4">

            {error && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6 p-4 bg-red-500/20 dark:bg-red-500/20 light:bg-red-100 border border-red-500/30 dark:border-red-500/30 light:border-red-300 text-red-300 dark:text-red-300 light:text-red-700 rounded-xl backdrop-blur-sm"
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
              <ClearResultsButton />
            </div>

            {/* Current Parameters */}
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-8 p-6 bg-gradient-to-br from-[#51A3F0]/10 to-[#99CBF7]/10 dark:from-[#51A3F0]/10 dark:to-[#99CBF7]/10 light:from-[#51A3F0]/20 light:to-[#99CBF7]/20 rounded-xl border border-white/10 dark:border-white/10 light:border-gray-200 backdrop-blur-sm"
            >
              <h3 className="text-sm font-medium text-[#99CBF7] dark:text-[#99CBF7] light:text-[#51A3F0] mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Current Parameters
              </h3>
              <p className="text-sm text-gray-300 dark:text-gray-300 light:text-gray-700">
                {rainfall.toFixed(1)}" of rain over {duration} hour{duration === 1 ? '' : 's'}
              </p>
            </motion.div>

            {/* Simulation Results */}
            {results && statistics && (
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="mt-6 p-6 bg-gradient-to-br from-[#99CBF7]/10 to-[#E0F1FF]/10 dark:from-[#99CBF7]/10 dark:to-[#E0F1FF]/10 light:from-[#99CBF7]/20 light:to-[#E0F1FF]/20 rounded-xl border border-white/10 dark:border-white/10 light:border-gray-200 backdrop-blur-sm"
              >
                <h3 className="text-sm font-medium text-[#E0F1FF] dark:text-[#E0F1FF] light:text-[#51A3F0] mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Simulation Results
                </h3>
                <div className="text-sm text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-2">
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
          )}
        </AnimatePresence>

        {/* Mobile Overlay - Behind Panel */}
        {isMobile && !isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-30"
            onClick={toggleCollapse}
            aria-hidden="true"
          />
        )}
      </main>
    </div>
  )
}

export default App
