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

      <div className="relative h-6 flex items-center">
        {/* Custom gradient track background - centered vertically */}
        <div 
          className="absolute top-1/2 left-0 w-full h-1 rounded-lg pointer-events-none z-0 -translate-y-1/2"
          style={{
            background: `linear-gradient(to right, 
              #87CEEB 0%, 
              #4FC3F7 15%, 
              #2196F3 35%, 
              #1565C0 60%, 
              #7B1FA2 80%, 
              #C62828 100%)`,
            opacity: 0.3
          }}
        />
        
        {/* Custom gradient fill - up to current value, centered vertically */}
        <div 
          className="absolute top-1/2 left-0 h-1 rounded-lg pointer-events-none z-10 -translate-y-1/2"
          style={{
            background: `linear-gradient(to right, 
              #87CEEB 0%, 
              #4FC3F7 15%, 
              #2196F3 35%, 
              #1565C0 60%, 
              #7B1FA2 80%, 
              #C62828 100%)`,
            width: `${((value - min) / (max - min)) * 100}%`,
            transition: 'width 0.1s ease-out'
          }}
        />
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onInput={handleInput}
          className="relative z-20 w-full bg-transparent rounded-lg appearance-none cursor-pointer slider-integrated
                     outline-none focus:outline-none focus-visible:outline-none
                     [&::-webkit-slider-runnable-track]:appearance-none
                     [&::-webkit-slider-runnable-track]:h-1
                     [&::-webkit-slider-runnable-track]:rounded-lg
                     [&::-webkit-slider-runnable-track]:bg-transparent
                     [&::-webkit-slider-runnable-track]:border-none
                     [&::-webkit-slider-runnable-track]:outline-none
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:w-1
                     [&::-webkit-slider-thumb]:rounded-sm
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:border-none
                     [&::-webkit-slider-thumb]:transition-all
                     [&::-webkit-slider-thumb]:duration-200
                     [&::-webkit-slider-thumb]:ease-in-out
                     [&::-webkit-slider-thumb]:hover:h-6
                     [&::-webkit-slider-thumb]:hover:shadow-xl
                     [&::-webkit-slider-thumb]:hover:bg-blue-50
                     [&::-webkit-slider-thumb]:active:h-4
                     [&::-webkit-slider-thumb]:active:shadow-md
                     [&::-webkit-slider-thumb]:outline-none
                     [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:w-1
                     [&::-moz-range-thumb]:rounded-sm
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:border-none
                     [&::-moz-range-thumb]:shadow-lg
                     [&::-moz-range-thumb]:transition-all
                     [&::-moz-range-thumb]:duration-200
                     [&::-moz-range-thumb]:ease-in-out
                     [&::-moz-range-thumb]:hover:h-6
                     [&::-moz-range-thumb]:hover:shadow-xl
                     [&::-moz-range-thumb]:hover:bg-blue-50
                     [&::-moz-range-thumb]:active:h-4
                     [&::-moz-range-thumb]:active:shadow-md
                     [&::-moz-range-thumb]:outline-none
                     [&::-moz-range-track]:h-1
                     [&::-moz-range-track]:rounded-lg
                     [&::-moz-range-track]:bg-transparent
                     [&::-moz-range-track]:border-none
                     [&::-moz-range-track]:outline-none"
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-400 light:text-gray-600 mt-2">
        <span>{min}"</span>
        <span>{max}"</span>
      </div>
    </motion.div>
  )
}

export default RainfallSlider