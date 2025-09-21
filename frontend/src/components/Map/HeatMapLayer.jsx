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
      // Map risk score (0-5 range) to heat intensity (0-1 range)
      const intensity = Math.min(1, Math.max(0, marker.riskScore / 5))

      return [
        marker.lat,
        marker.lng,
        intensity
      ]
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