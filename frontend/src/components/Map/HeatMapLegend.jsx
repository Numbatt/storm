import { motion } from 'framer-motion'

const HeatMapLegend = ({ isVisible = true }) => {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-4 left-4 z-[1000]"
    >
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg p-4 min-w-[200px]">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Flood Risk Level
        </h3>

        {/* Heat Map Gradient Bar */}
        <div className="relative mb-3">
          <div
            className="h-4 rounded-lg"
            style={{
              background: 'linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)'
            }}
          />

          {/* Risk Level Labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
        </div>

        {/* Legend Items */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">Low Risk Areas</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">Moderate Risk Areas</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">High Risk Areas</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Heat intensity represents flood risk probability based on elevation, slope, and proximity to water.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default HeatMapLegend