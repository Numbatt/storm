import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { selectLoading, selectProgressStage, runSimulation } from '../../store/slices/simulationSlice'

const SimulationButton = ({
  disabled = false,
  children = 'Run Simulation'
}) => {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const progressStage = useSelector(selectProgressStage)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const buttonRef = useRef(null)

  const handleClick = () => {
    dispatch(runSimulation())
  }

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return
    
    const rect = buttonRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setMousePosition({ x, y })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled || loading}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 }}
      whileHover={!loading && !disabled ? { scale: 1.05 } : {}}
      whileTap={!loading && !disabled ? { scale: 0.95 } : {}}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative w-full px-8 py-4 rounded-lg transition-all duration-300 overflow-hidden
        ${loading || disabled
          ? 'bg-gray-600/50 dark:bg-gray-600/50 light:bg-gray-400/50 cursor-not-allowed border-2 border-gray-600 dark:border-gray-600 light:border-gray-400'
          : 'gradient-border-button bg-black dark:bg-black light:bg-white hover:bg-black dark:hover:bg-black light:hover:bg-gray-50'
        }
      `}
    >
      {/* Cursor-following glow effect - masked inside button */}
      {!loading && !disabled && isHovered && (
        <div
          className="cursor-glow"
          style={{
            left: mousePosition.x - 75,
            top: mousePosition.y - 75,
            width: '150px',
            height: '150px',
            opacity: isHovered ? 1 : 0
          }}
        />
      )}
      
      {/* Button content - no blocking background */}
      <div className="relative z-10 flex items-center justify-center">
        {loading && (
          <motion.svg
            className="mr-3 h-5 w-5 text-white dark:text-white light:text-gray-900"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </motion.svg>
        )}

        <div className="flex flex-col items-center">
          <span className="text-white dark:text-white light:text-gray-900 text-lg tracking-wide font-medium">
            {loading ? 'Running Simulation...' : children}
          </span>
          {loading && progressStage && (
            <span className="text-xs text-white/80 dark:text-white/80 light:text-gray-700 mt-1">
              {progressStage}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

export default SimulationButton