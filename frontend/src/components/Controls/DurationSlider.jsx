import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { selectDuration, setDuration } from '../../store/slices/simulationSlice'

const DurationSlider = ({ min = 0.5, max = 8, step = 0.5 }) => {
  const dispatch = useDispatch()
  const value = useSelector(selectDuration)

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    dispatch(setDuration(newValue))
  }

  const formatDuration = (hours) => {
    if (hours === 1) return '1 hour'
    if (hours < 1) return `${(hours * 60)} minutes`
    return `${hours} hours`
  }

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="relative"
    >
      <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700 mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-[#74B5F2]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Storm Duration
        </div>
        <div className="group relative">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-500 light:text-gray-400 hover:text-gray-300 dark:hover:text-gray-300 light:hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 dark:bg-gray-900 light:bg-white text-white dark:text-white light:text-gray-900 text-xs rounded-lg shadow-lg border-0 dark:border-0 light:border light:border-gray-200 z-10">
            Set how long the rainfall event lasts. Longer durations allow more water accumulation. Short bursts (0.5-2 hrs) vs sustained storms (4-8 hrs) have different flood impacts.
          </div>
        </div>
      </label>

      <div className="mb-4">
        <motion.span 
          className="text-2xl font-light bg-gradient-to-r from-[#74B5F2] to-[#BBDCFA] bg-clip-text text-transparent"
          key={value}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {formatDuration(value)}
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
                     [&::-webkit-slider-thumb]:from-[#74B5F2]
                     [&::-webkit-slider-thumb]:to-[#BBDCFA]
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-white
                     [&::-moz-range-thumb]:h-6
                     [&::-moz-range-thumb]:w-6
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-gradient-to-r
                     [&::-moz-range-thumb]:from-[#74B5F2]
                     [&::-moz-range-thumb]:to-[#BBDCFA]
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
          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[#74B5F2] to-[#BBDCFA] rounded-lg pointer-events-none"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-400 light:text-gray-600 mt-2">
        <span>30min</span>
        <span>8hrs</span>
      </div>
    </motion.div>
  )
}

export default DurationSlider