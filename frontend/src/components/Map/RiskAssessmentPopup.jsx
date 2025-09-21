import { useState, useEffect } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectResults } from '../../store/slices/simulationSlice'
import { getRiskColor } from '../../constants/colors'

const RiskAssessmentPopup = () => {
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [popupData, setPopupData] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const map = useMap()
  const navigate = useNavigate()
  const results = useSelector(selectResults)

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
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowPopup(false)
        setPopupData(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Reset processing state when component unmounts
  useEffect(() => {
    return () => {
      setIsProcessing(false)
    }
  }, [])

  // Find risk data for coordinates
  const findRiskDataForCoordinates = (lat, lng) => {
    if (!results || results.length === 0) return null

    const tolerance = 0.001 // ~100m tolerance
    const closestMarker = results.find(marker => {
      const latDiff = Math.abs(marker.lat - lat)
      const lngDiff = Math.abs(marker.lng - lng)
      return latDiff < tolerance && lngDiff < tolerance
    })

    return closestMarker
  }

  // Map events for Shift+click
  useMapEvents({
    click: async (e) => {
      if (!isShiftPressed || isProcessing) return

      setIsProcessing(true)
      
      const { lat, lng } = e.latlng
      const riskMarker = findRiskDataForCoordinates(lat, lng)

      // Fetch elevation data from backend
      let elevationData = null
      try {
        const response = await fetch(`/api/elevation?lat=${lat}&lng=${lng}`)
        if (response.ok) {
          const data = await response.json()
          elevationData = data.elevation
        }
      } catch (error) {
        console.error('Error fetching elevation:', error)
      }

      const popupInfo = {
        coordinates: { lat: lat.toFixed(6), lng: lng.toFixed(6) }, // 6-decimal precision
        elevation: elevationData,
        existingRisk: riskMarker,
        clickPosition: e.containerPoint,
        timestamp: new Date().toISOString()
      }

      // Close any existing popup first
      setShowPopup(false)
      
      // Small delay to prevent rapid-fire clicks
      setTimeout(() => {
        setPopupData(popupInfo)
        setShowPopup(true)
        setIsProcessing(false)
      }, 100)
    }
  })

  const handlePerformRiskAssessment = () => {
    console.log('🎯 Performing Risk Assessment for:', {
      coordinates: popupData.coordinates,
      elevation: popupData.elevation,
      existingRiskLevel: popupData.existingRisk?.riskLevel || 'None',
      requestedAt: popupData.timestamp,
      assessmentType: 'Manual Location Assessment'
    })

    // Close popup and navigate to storm analysis page
    setShowPopup(false)
    setPopupData(null)
    setIsProcessing(false)
    navigate('/analysis-storm')
  }

  const handleClosePopup = () => {
    setShowPopup(false)
    setPopupData(null)
    setIsProcessing(false)
  }

  if (!showPopup || !popupData) {
    return null
  }

  return (
    <div
      className="absolute z-[1001] bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px]"
      style={{
        left: Math.min(popupData.clickPosition.x + 10, window.innerWidth - 300),
        top: Math.max(popupData.clickPosition.y - 120, 10),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            Risk Assessment
          </h3>
          {/* Visual risk indicator */}
          {popupData.existingRisk && (
            <div
              className="ml-2 w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: popupData.existingRisk.riskColor }}
              title={`${popupData.existingRisk.riskLevel} Risk`}
            />
          )}
        </div>
        <button
          onClick={handleClosePopup}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Location Info */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Coordinates:</span>
          <span className="font-mono text-gray-800 text-xs">
            {popupData.coordinates.lat}, {popupData.coordinates.lng}
          </span>
        </div>

        {popupData.elevation !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600">Elevation:</span>
            <span className="font-mono text-gray-800">
              {popupData.elevation.toFixed(2)}m
            </span>
          </div>
        )}

        {popupData.existingRisk && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">Risk Level:</span>
              <span
                className="font-medium"
                style={{ color: popupData.existingRisk.riskColor }}
              >
                {popupData.existingRisk.riskLevel}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Risk Score:</span>
              <span className="font-mono text-gray-800">
                {popupData.existingRisk.riskScore.toFixed(3)}
              </span>
            </div>

            {popupData.existingRisk.slope !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Slope:</span>
                <span className="font-mono text-gray-800">
                  {popupData.existingRisk.slope.toFixed(2)}%
                </span>
              </div>
            )}

            {popupData.existingRisk.proximityToWater !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Water Proximity:</span>
                <span className="font-mono text-gray-800">
                  {popupData.existingRisk.proximityToWater.toFixed(2)}
                </span>
              </div>
            )}
          </>
        )}

        {!popupData.existingRisk && (
          <div className="text-center text-gray-500 italic py-2">
            No risk data available for this location
          </div>
        )}
      </div>

      {/* Risk Assessment Button */}
      <button
        onClick={handlePerformRiskAssessment}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
      >
        Perform Risk Assessment
      </button>

      <div className="text-xs text-gray-500 mt-2 text-center">
        Press Escape to close
      </div>
    </div>
  )
}

export default RiskAssessmentPopup