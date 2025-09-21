import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import 'leaflet.heat'

const HeatMapLayer = ({ data = [], options = {} }) => {
  const map = useMap()
  const heatLayerRef = useRef(null)

  // Default heat map options
  const defaultOptions = {
    radius: 80,
    blur: 40,
    maxZoom: 17,
    gradient: {
      0.0: '#10b981',  // Green (low risk)
      0.3: '#f59e0b',  // Yellow (moderate risk)
      0.6: '#ef4444',  // Red (high risk)
      1.0: '#dc2626'   // Dark red (very high risk)
    }
  }

  const mergedOptions = { ...defaultOptions, ...options }

  useEffect(() => {
    if (!map || !data.length) return

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
    }

    // Convert risk markers to heat map data format
    const heatData = data.map(marker => {
      // Map risk category to heat intensity for visual consistency
      let intensity;

      if (marker.riskLevel === 'HIGH') {
        intensity = 0.9;  // High intensity for high risk
      } else if (marker.riskLevel === 'MODERATE') {
        intensity = 0.5;  // Medium intensity for moderate risk
      } else if (marker.riskLevel === 'LOW') {
        intensity = 0.1;  // Low intensity for low risk
      } else {
        // Fallback: use risk score if category not available
        intensity = Math.min(0.8, Math.max(0.1, marker.riskScore / 10));
      }

      return [
        marker.lat,
        marker.lng,
        intensity
      ]
    })

    console.log(`🗺️ Heat map data: ${heatData.length} points, intensity distribution:`, {
      high: heatData.filter(([,,i]) => i >= 0.8).length,
      moderate: heatData.filter(([,,i]) => i >= 0.4 && i < 0.8).length,
      low: heatData.filter(([,,i]) => i < 0.4).length
    })

    // Create and add new heat layer
    heatLayerRef.current = window.L.heatLayer(heatData, mergedOptions)
    heatLayerRef.current.addTo(map)

    console.log(`Heat map created with ${heatData.length} points`)

    // Cleanup function
    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current)
      }
    }
  }, [map, data, mergedOptions])

  // Component cleanup
  useEffect(() => {
    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current)
      }
    }
  }, [])

  // This component doesn't render anything visible directly
  // The heat layer is added to the map imperatively
  return null
}

export default HeatMapLayer