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

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="relative"
    >
      <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700 mb-4 flex items-center">
        <svg className="w-4 h-4 mr-2 text-[#51A3F0]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15v-3a2 2 0 114 0v3H8z" />
        </svg>
        Rainfall Amount
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
          className="w-full h-2 bg-gray-700/50 dark:bg-gray-700/50 light:bg-gray-300 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:h-6
                     [&::-webkit-slider-thumb]:w-6
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-gradient-to-r
                     [&::-webkit-slider-thumb]:from-[#51A3F0]
                     [&::-webkit-slider-thumb]:to-[#99CBF7]
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-white
                     [&::-moz-range-thumb]:h-6
                     [&::-moz-range-thumb]:w-6
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-gradient-to-r
                     [&::-moz-range-thumb]:from-[#51A3F0]
                     [&::-moz-range-thumb]:to-[#99CBF7]
                     [&::-moz-range-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-white
                     [&::-moz-range-thumb]:border-none
                     [&::-moz-range-track]:bg-gray-700/50
                     [&::-moz-range-track]:rounded-lg
                     [&::-moz-range-track]:h-2"
        />
        
        {/* Custom track fill */}
        <div 
          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[#51A3F0] to-[#99CBF7] rounded-lg pointer-events-none"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
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