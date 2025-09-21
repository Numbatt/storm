import React from 'react'
import { motion } from 'framer-motion'

function CircularGauge({ 
  value, 
  max = 100, 
  size = 120, 
  strokeWidth = 8, 
  color = '#60a5fa',
  backgroundColor = '#374151',
  label = 'Risk Score',
  showValue = true,
  animationDelay = 0
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min(value / max, 1)
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (percentage * circumference)

  // Color based on risk level
  const getRiskColor = (score) => {
    if (score >= 66) return '#ef4444' // red
    if (score >= 33) return '#f59e0b' // orange
    return '#10b981' // green
  }

  const riskColor = color === '#60a5fa' ? getRiskColor(value) : color

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={riskColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ 
            duration: 1.5, 
            delay: animationDelay,
            ease: "easeInOut" 
          }}
          className="drop-shadow-sm"
          style={{
            filter: `drop-shadow(0 0 6px ${riskColor}40)`
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: animationDelay + 0.5 }}
            className="text-center"
          >
            <div 
              className="text-2xl font-bold"
              style={{ color: riskColor }}
            >
              {value.toFixed(1)}
            </div>
            <div className="text-xs text-gray-400 -mt-1">
              {label}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CircularGauge
