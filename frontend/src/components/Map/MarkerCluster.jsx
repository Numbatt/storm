import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'

// Create custom icons for different risk levels
const createRiskIcon = (riskLevel) => {
  const colors = {
    high: '#ef4444',    // red-500
    moderate: '#f59e0b', // amber-500
    low: '#10b981'      // emerald-500
  }
  
  const color = colors[riskLevel] || colors.low
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="10" cy="10" r="3" fill="white"/>
      </svg>
    `)}`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  })
}

const MarkerCluster = ({ markers = [] }) => {
  if (!markers || markers.length === 0) {
    return null
  }

  return (
    <>
      {markers.map((marker, index) => {
        // Ensure marker has required properties
        if (!marker.latitude || !marker.longitude) {
          return null
        }

        const riskLevel = marker.risk_level || marker.riskLevel || 'low'
        const icon = createRiskIcon(riskLevel)

        return (
          <Marker
            key={index}
            position={[marker.latitude, marker.longitude]}
            icon={icon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-2">
                  Risk Assessment
                </h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Risk Level:</span>
                    <span className={`font-medium ${
                      riskLevel === 'high' ? 'text-red-600' :
                      riskLevel === 'moderate' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                    </span>
                  </div>
                  {marker.depth && (
                    <div className="flex justify-between">
                      <span>Depth:</span>
                      <span className="font-medium">{marker.depth.toFixed(2)} ft</span>
                    </div>
                  )}
                  {marker.velocity && (
                    <div className="flex justify-between">
                      <span>Velocity:</span>
                      <span className="font-medium">{marker.velocity.toFixed(2)} ft/s</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span className="font-mono text-xs">
                      {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

export default MarkerCluster