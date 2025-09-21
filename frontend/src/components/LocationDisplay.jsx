import { motion } from 'framer-motion'
import { useLocation } from '../contexts/LocationContext'

const LocationDisplay = ({ prefix = '', suffix = '' }) => {
  const { currentLocation, isLoading: locationLoading } = useLocation()

  return (
    <motion.span
      key={currentLocation.fullName}
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center"
    >
      {locationLoading ? (
        <span className="flex items-center">
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span>Detecting location...</span>
        </span>
      ) : (
        `${prefix}${currentLocation.fullName}${suffix}`
      )}
    </motion.span>
  )
}

export default LocationDisplay
