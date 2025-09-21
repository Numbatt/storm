// Centralized color scheme for flood risk visualization
// Ensures consistent color usage across markers, zones, legend, and popups

export const RISK_COLORS = {
  HIGH: '#ef4444',      // Red - High flood risk
  MODERATE: '#f59e0b',  // Yellow/Orange - Moderate flood risk
  LOW: '#10b981'        // Green - Low flood risk
}

// Alternative color names for easier access
export const COLORS = {
  RED: RISK_COLORS.HIGH,
  YELLOW: RISK_COLORS.MODERATE,
  GREEN: RISK_COLORS.LOW
}

// Color mapping by risk level string
export const getRiskColor = (riskLevel) => {
  const level = riskLevel?.toUpperCase()
  return RISK_COLORS[level] || RISK_COLORS.MODERATE
}

// Color accessibility information
export const COLOR_INFO = {
  [RISK_COLORS.HIGH]: {
    name: 'Red',
    contrast: 'AAA', // High contrast for accessibility
    usage: 'High flood risk areas, critical alerts'
  },
  [RISK_COLORS.MODERATE]: {
    name: 'Yellow',
    contrast: 'AA', // Good contrast for accessibility
    usage: 'Moderate flood risk areas, warnings'
  },
  [RISK_COLORS.LOW]: {
    name: 'Green',
    contrast: 'AAA', // High contrast for accessibility
    usage: 'Low flood risk areas, safe zones'
  }
}

// Export default for convenience
export default RISK_COLORS