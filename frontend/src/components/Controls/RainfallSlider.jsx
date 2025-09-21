import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { selectRainfall, setRainfall } from '../../store/slices/simulationSlice'

const RainfallSlider = ({ min = 0, max = 20, step = 0.1 }) => {
  const dispatch = useDispatch()
  const value = useSelector(selectRainfall)

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    dispatch(setRainfall(newValue))
  }

  // Real-time input handler for immediate updates
  const handleInput = (e) => {
    const newValue = parseFloat(e.target.value)
    dispatch(setRainfall(newValue))
  }

  // Enhanced smooth gradient: Light Blue -> Medium Blue -> Deep Blue -> Purple -> Dark Red
  const getGradientColor = (val) => {
    const percentage = (val - min) / (max - min)
    
    // Define color palette for rainfall intensity
    const colors = [
      { stop: 0, color: '#87CEEB' },    // Light sky blue (0-1")
      { stop: 0.15, color: '#4FC3F7' }, // Light blue (1-3")
      { stop: 0.35, color: '#2196F3' }, // Medium blue (3-7")
      { stop: 0.60, color: '#1565C0' }, // Deep blue (7-12")
      { stop: 0.80, color: '#7B1FA2' }, // Purple (12-16")
      { stop: 1, color: '#C62828' }     // Dark red (16-20")
    ]
    
    // Create smooth gradient with all color stops
    const gradientStops = colors.map(({ stop, color }) => 
      `${color} ${(stop * 100).toFixed(1)}%`
    ).join(', ')
    
    // Create the gradient that fills up to current value
    const fillPercentage = (percentage * 100).toFixed(1)
    
    return `linear-gradient(to right, ${gradientStops})`
  }

  const trackFillStyle = {
    background: getGradientColor(value),
    width: `${((value - min) / (max - min)) * 100}%`,
    transition: 'none',
    position: 'relative',
    overflow: 'hidden'
  }

  // Background gradient for the entire track
  const trackBackgroundStyle = {
    background: `linear-gradient(to right, 
      #87CEEB 0%, 
      #4FC3F7 15%, 
      #2196F3 35%, 
      #1565C0 60%, 
      #7B1FA2 80%, 
      #C62828 100%)`,
    opacity: 0.3
  }

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="relative"
    >
      <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700 mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-[#51A3F0]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15v-3a2 2 0 114 0v3H8z" />
          </svg>
          Rainfall Amount
        </div>
        <div className="group relative">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-500 light:text-gray-400 hover:text-gray-300 dark:hover:text-gray-300 light:hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 dark:bg-gray-900 light:bg-white text-white dark:text-white light:text-gray-900 text-xs rounded-lg shadow-lg border-0 dark:border-0 light:border light:border-gray-200 z-10">
            Set the total amount of rainfall for the flood simulation. Higher values increase flood risk. Typical range: 1-10 inches for normal storms, 10+ for severe weather.
          </div>
        </div>
      </label>

      <div className="mb-4">
        <motion.span 
          className="text-2xl font-light bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] bg-clip-text text-transparent"
          key={value}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {value.toFixed(1)}"
        </motion.span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onInput={handleInput}
          className="w-full h-2 bg-gray-700/50 dark:bg-gray-700/50 light:bg-gray-300 rounded-lg appearance-none cursor-pointer rainfall-slider
                     [&::-webkit-slider-runnable-track]:appearance-none
                     [&::-webkit-slider-runnable-track]:bg-gray-700/50
                     [&::-webkit-slider-runnable-track]:dark:bg-gray-700/50
                     [&::-webkit-slider-runnable-track]:light:bg-gray-300
                     [&::-webkit-slider-runnable-track]:rounded-lg
                     [&::-webkit-slider-runnable-track]:h-2
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:h-7
                     [&::-webkit-slider-thumb]:w-7
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-xl
                     [&::-webkit-slider-thumb]:border-3
                     [&::-webkit-slider-thumb]:border-blue-400
                     [&::-webkit-slider-thumb]:transition-none
                     [&::-webkit-slider-thumb]:duration-0
                     [&::-moz-range-thumb]:h-7
                     [&::-moz-range-thumb]:w-7
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:border-3
                     [&::-moz-range-thumb]:border-blue-400
                     [&::-moz-range-thumb]:border-none
                     [&::-moz-range-thumb]:shadow-xl
                     [&::-moz-range-track]:bg-gray-700/50
                     [&::-moz-range-track]:rounded-lg
                     [&::-moz-range-track]:h-2"
        />
        
        {/* Custom gradient track fill */}
        <div 
          className="absolute top-0 left-0 h-2 rounded-lg pointer-events-none rainfall-gradient-fill"
          style={trackFillStyle}
        >
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 rounded-lg opacity-30 rainfall-texture"></div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-400 light:text-gray-600 mt-2">
        <span>{min}"</span>
        <span>{max}"</span>
      </div>
    </motion.div>
  )
}

export default RainfallSlider