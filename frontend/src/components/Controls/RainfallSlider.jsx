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

  // Calculate dynamic gradient based on value
  const getGradientColor = (val) => {
    const percentage = (val - min) / (max - min)
    
    if (percentage <= 0.33) {
      // Light Blue to Royal Purple (0-33%)
      const localPercent = percentage / 0.33
      return `linear-gradient(to right, #6ECFFF ${localPercent * 100}%, #6A0DAD 100%)`
    } else if (percentage <= 0.66) {
      // Royal Purple to Orange (33-66%)
      const localPercent = (percentage - 0.33) / 0.33
      return `linear-gradient(to right, #6ECFFF 0%, #6A0DAD ${localPercent * 100}%, #FF8C42 100%)`
    } else {
      // Orange dominant (66-100%)
      const localPercent = (percentage - 0.66) / 0.34
      return `linear-gradient(to right, #6ECFFF 0%, #6A0DAD 50%, #FF8C42 ${50 + localPercent * 50}%)`
    }
  }

  const trackFillStyle = {
    background: getGradientColor(value),
    width: `${((value - min) / (max - min)) * 100}%`,
    transition: 'background 0.3s ease, width 0.3s ease'
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
          <svg className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-help" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
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
          className="w-full h-2 bg-gray-700/50 dark:bg-gray-700/50 light:bg-gray-300 rounded-lg appearance-none cursor-pointer relative z-10
                     [&::-webkit-slider-runnable-track]:appearance-none
                     [&::-webkit-slider-runnable-track]:bg-transparent
                     [&::-webkit-slider-runnable-track]:rounded-lg
                     [&::-webkit-slider-runnable-track]:h-2
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:h-6
                     [&::-webkit-slider-thumb]:w-6
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-gray-400
                     [&::-webkit-slider-thumb]:relative
                     [&::-webkit-slider-thumb]:z-20
                     [&::-moz-range-thumb]:h-6
                     [&::-moz-range-thumb]:w-6
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-gray-400
                     [&::-moz-range-thumb]:border-none
                     [&::-moz-range-track]:bg-transparent
                     [&::-moz-range-track]:rounded-lg
                     [&::-moz-range-track]:h-2"
        />
        
        {/* Dynamic gradient track fill */}
        <div 
          className="absolute top-0 left-0 h-2 rounded-lg pointer-events-none transition-all duration-300 ease-out"
          style={trackFillStyle}
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