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
        // Ensure marker has required properties (check both lat/lng and latitude/longitude)
        const lat = marker.lat || marker.latitude
        const lng = marker.lng || marker.longitude
        
        if (!lat || !lng) {
          return null
        }

        // Backend sends uppercase risk levels, convert to lowercase for icon mapping
        const riskLevelRaw = marker.risk_level || marker.riskLevel || 'LOW'
        const riskLevel = riskLevelRaw.toLowerCase()
        const icon = createRiskIcon(riskLevel)

        return (
          <Marker
            key={index}
            position={[lat, lng]}
            icon={icon}
          >
            <Popup>
              <div className="p-3 min-w-[280px]">
                <div className="flex items-center mb-3">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    riskLevel === 'high' ? 'bg-red-500' :
                    riskLevel === 'moderate' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  <h3 className="font-semibold text-sm">
                    Flood Risk Assessment
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span className={`font-bold ${
                      riskLevel === 'high' ? 'text-red-600' :
                      riskLevel === 'moderate' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                    </span>
                  </div>

                  {marker.elevation !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Elevation:</span>
                      <span className="font-medium">{marker.elevation.toFixed(2)} m</span>
                    </div>
                  )}

                  {marker.riskScore !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk Score:</span>
                      <span className="font-medium">{marker.riskScore.toFixed(3)}</span>
                    </div>
                  )}

                  {marker.slope !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slope:</span>
                      <span className="font-medium">{marker.slope.toFixed(2)}%</span>
                    </div>
                  )}

                  {marker.proximityToWater !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Water Proximity:</span>
                      <span className="font-medium">{marker.proximityToWater.toFixed(2)}</span>
                    </div>
                  )}

                  {marker.flowAccumulation !== undefined && marker.flowAccumulation > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Flow Accumulation:</span>
                      <span className="font-medium">{marker.flowAccumulation.toFixed(1)}</span>
                    </div>
                  )}

                  {marker.flowLength !== undefined && marker.flowLength > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Flow Length:</span>
                      <span className="font-medium">{marker.flowLength.toFixed(1)} m</span>
                    </div>
                  )}

                  {marker.drainageArea !== undefined && marker.drainageArea > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Drainage Area:</span>
                      <span className="font-medium">{marker.drainageArea.toFixed(1)}</span>
                    </div>
                  )}

                  {marker.depth && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Depth:</span>
                      <span className="font-medium">{marker.depth.toFixed(2)} ft</span>
                    </div>
                  )}

                  {marker.velocity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Flow Velocity:</span>
                      <span className="font-medium">{marker.velocity.toFixed(2)} ft/s</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Coordinates:</span>
                      <span className="font-mono text-xs text-gray-700">
                        {lat.toFixed(6)}, {lng.toFixed(6)}
                      </span>
                    </div>
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