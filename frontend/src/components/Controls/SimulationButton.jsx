import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { selectLoading, runSimulation } from '../../store/slices/simulationSlice'

const SimulationButton = ({
  disabled = false,
  children = 'Run Simulation'
}) => {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)

  const handleClick = () => {
    dispatch(runSimulation())
  }
  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || loading}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 }}
      whileHover={!loading && !disabled ? { scale: 1.02 } : {}}
      whileTap={!loading && !disabled ? { scale: 0.98 } : {}}
      className={`
        relative w-full py-4 px-6 rounded-xl font-light text-white transition-all duration-300
        overflow-hidden group
        ${loading || disabled
          ? 'bg-gray-600/50 cursor-not-allowed'
          : 'bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] hover:from-[#4A9AE8] hover:to-[#8BC3F0] shadow-lg hover:shadow-xl hover:shadow-[#51A3F0]/25'
        }
      `}
    >
      {/* Animated background */}
      {!loading && !disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#74B5F2] to-[#E0F1FF] opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
      )}
      
      <div className="relative flex items-center justify-center">
        {loading && (
          <motion.svg
            className="mr-3 h-5 w-5 text-white"
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

        <span className="text-lg tracking-wide">
          {loading ? 'Running Simulation...' : children}
        </span>
      </div>
    </motion.button>
  )
}

export default SimulationButton