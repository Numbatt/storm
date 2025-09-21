import { CircleMarker, Popup, useMap } from 'react-leaflet'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const RiskMarker = ({ marker }) => {
  const map = useMap()
  const [currentZoom, setCurrentZoom] = useState(map.getZoom())
  const {
    lat,
    lng,
    elevation,
    riskScore,
    riskLevel,
    riskColor,
    riskDescription
  } = marker

  // Update zoom level when map zooms
  useEffect(() => {
    const handleZoom = () => {
      setCurrentZoom(map.getZoom())
    }

    map.on('zoom', handleZoom)
    return () => {
      map.off('zoom', handleZoom)
    }
  }, [map])

  // Get marker size based on risk level and zoom level
  const getMarkerSize = (riskLevel, zoom) => {
    // Base sizes for different risk levels
    const baseSizes = {
      'HIGH': 12,
      'MODERATE': 8,
      'LOW': 6
    }

    const baseSize = baseSizes[riskLevel] || 8

    // Scale factor based on zoom level (zoom 10 is baseline)
    const zoomFactor = Math.max(0.5, Math.min(2, zoom / 10))

    return Math.round(baseSize * zoomFactor)
  }

  // Get marker opacity based on risk level
  const getMarkerOpacity = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return 0.9
      case 'MODERATE':
        return 0.8
      case 'LOW':
        return 0.7
      default:
        return 0.8
    }
  }

  const markerSize = getMarkerSize(riskLevel, currentZoom)
  const markerOpacity = getMarkerOpacity(riskLevel)

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={markerSize}
      pathOptions={{
        color: '#ffffff',
        weight: 2,
        fillColor: riskColor,
        fillOpacity: markerOpacity,
        opacity: 1
      }}
    >
      <Popup className="risk-marker-popup">
        <div className="p-3 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              Flood Risk Assessment
            </h3>
            <div
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ backgroundColor: riskColor }}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Risk Level:</span>
              <span
                className="font-medium"
                style={{ color: riskColor }}
              >
                {riskLevel}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Risk Score:</span>
              <span className="font-medium text-gray-800">
                {riskScore.toFixed(3)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Elevation:</span>
              <span className="font-medium text-gray-800">
                {elevation.toFixed(1)}m
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Coordinates:</span>
              <span className="font-medium text-gray-800 text-xs">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              {riskDescription}
            </p>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  )
}

export default RiskMarker