import { useState, useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import { useSelector } from 'react-redux'
import { selectResults } from '../../store/slices/simulationSlice'
import { useLocation } from '../../contexts/LocationContext'

const CoordinateInspector = () => {
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [mousePosition, setMousePosition] = useState(null)
  const [coordinates, setCoordinates] = useState(null)
  const [elevationData, setElevationData] = useState(null)
  const [riskData, setRiskData] = useState(null)
  const [showTooltip, setShowTooltip] = useState(false)

  const map = useMap()
  const results = useSelector(selectResults)
  const inspectorRef = useRef(null)
  const { updateLocation } = useLocation()
  
  // Throttle location updates to avoid excessive API calls
  const locationUpdateTimeoutRef = useRef(null)
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (locationUpdateTimeoutRef.current) {
        clearTimeout(locationUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Handle keyboard events for Shift key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true)
      }
    }

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
        setShowTooltip(false)
        setCoordinates(null)
        setElevationData(null)
        setRiskData(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Find risk data for coordinates
  const findRiskDataForCoordinates = (lat, lng) => {
    if (!results || results.length === 0) return null

    // Find the closest risk marker within a small tolerance
    const tolerance = 0.001 // ~100m tolerance
    const closestMarker = results.find(marker => {
      const latDiff = Math.abs(marker.lat - lat)
      const lngDiff = Math.abs(marker.lng - lng)
      return latDiff < tolerance && lngDiff < tolerance
    })

    return closestMarker
  }

  // Fetch elevation data from backend
  const fetchElevationData = async (lat, lng) => {
    try {
      const response = await fetch(`http://localhost:3001/api/elevation?lat=${lat}&lng=${lng}`)
      if (response.ok) {
        const data = await response.json()
        // Only return elevation if it's a valid number
        if (data.elevation !== null && !isNaN(data.elevation)) {
          return data.elevation
        }
      }
      return null
    } catch (error) {
      // Silently handle network errors - elevation data is optional
      return null
    }
  }

  // Map events for mouse movement and clicks
  useMapEvents({
    mousemove: async (e) => {
      const { lat, lng } = e.latlng
      
      // Always update location for dynamic heading (throttled)
      if (locationUpdateTimeoutRef.current) {
        clearTimeout(locationUpdateTimeoutRef.current)
      }
      locationUpdateTimeoutRef.current = setTimeout(() => {
        updateLocation(lat, lng).catch(error => {
          console.warn('Failed to update location:', error)
        })
      }, 300) // Throttle to 300ms to reduce API calls
      
      // Show tooltip only when Shift is pressed
      if (!isShiftPressed) return

      setCoordinates({ lat: lat.toFixed(4), lng: lng.toFixed(4) })
      setMousePosition({ x: e.containerPoint.x, y: e.containerPoint.y })

      // Look for risk data
      const riskMarker = findRiskDataForCoordinates(lat, lng)
      setRiskData(riskMarker)

      // Temporarily disable elevation fetching due to coordinate transformation issues
      // const elevation = await fetchElevationData(lat, lng)
      // setElevationData(elevation)
      setElevationData(null)

      setShowTooltip(true)
    },

    // Click events are handled by RiskAssessmentPopup component
  })

  if (!showTooltip || !coordinates || !mousePosition) {
    return null
  }

  return (
    <div
      ref={inspectorRef}
      className="absolute z-[1000] pointer-events-none bg-black/80 text-white p-3 rounded-lg shadow-lg text-sm"
      style={{
        left: mousePosition.x + 10,
        top: mousePosition.y - 80,
      }}
    >
      <div className="space-y-1">
        <div className="font-medium text-blue-300">Coordinate Inspection</div>
        <div className="flex justify-between">
          <span className="text-gray-300">Lat:</span>
          <span className="font-mono">{coordinates.lat}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Lng:</span>
          <span className="font-mono">{coordinates.lng}°</span>
        </div>

        {elevationData !== null && (
          <div className="flex justify-between">
            <span className="text-gray-300">Elevation:</span>
            <span className="font-mono">{elevationData.toFixed(1)}m</span>
          </div>
        )}

        {riskData && (
          <div className="flex justify-between">
            <span className="text-gray-300">Risk Level:</span>
            <span
              className="font-medium"
              style={{ color: riskData.riskColor }}
            >
              {riskData.riskLevel}
            </span>
          </div>
        )}

        <div className="text-xs text-gray-400 mt-2 border-t border-gray-600 pt-1">
          Shift+Click for risk assessment
        </div>
      </div>
    </div>
  )
}

export default CoordinateInspector