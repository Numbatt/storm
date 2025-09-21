import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { selectResults, selectLoading, clearResults } from '../../store/slices/simulationSlice'

const ClearResultsButton = () => {
  const dispatch = useDispatch()
  const results = useSelector(selectResults)
  const loading = useSelector(selectLoading)

  const handleClear = () => {
    dispatch(clearResults())
  }

  if (!results || results.length === 0 || loading) {
    return null
  }

  return (
    <motion.button
      onClick={handleClear}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full py-2 px-4 text-sm text-gray-300 dark:text-gray-300 light:text-gray-600 border border-gray-600 dark:border-gray-600 light:border-gray-400 rounded-lg hover:border-gray-500 dark:hover:border-gray-500 light:hover:border-gray-500 hover:text-white dark:hover:text-white light:hover:text-gray-800 transition-all duration-200 bg-transparent hover:bg-gray-800/30 dark:hover:bg-gray-800/30 light:hover:bg-gray-200/30"
    >
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Clear Results</span>
      </div>
    </motion.button>
  )
}

export default ClearResultsButton