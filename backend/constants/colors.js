// Centralized color scheme for flood risk visualization
// Ensures consistent color usage across backend API responses

const RISK_COLORS = {
  HIGH: '#ef4444',      // Red - High flood risk
  MODERATE: '#f59e0b',  // Yellow/Orange - Moderate flood risk
  LOW: '#10b981'        // Green - Low flood risk
}

// Alternative color names for easier access
const COLORS = {
  RED: RISK_COLORS.HIGH,
  YELLOW: RISK_COLORS.MODERATE,
  GREEN: RISK_COLORS.LOW
}

// Color mapping by risk level string
const getRiskColor = (riskLevel) => {
  const level = riskLevel?.toUpperCase()
  return RISK_COLORS[level] || RISK_COLORS.MODERATE
}

module.exports = {
  RISK_COLORS,
  COLORS,
  getRiskColor
}