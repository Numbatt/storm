import { MapContainer, TileLayer } from 'react-leaflet'
import { useSelector } from 'react-redux'
import { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { selectResults, selectLoading } from '../../store/slices/simulationSlice'
import MarkerCluster from './MarkerCluster'
import HeatMapLayer from './HeatMapLayer'
import HeatMapLegend from './HeatMapLegend'
import CoordinateInspector from './CoordinateInspector'
import RiskAssessmentPopup from './RiskAssessmentPopup'
import 'leaflet/dist/leaflet.css'

const FloodMap = () => {
  const { isDark } = useTheme()
  const results = useSelector(selectResults)
  const loading = useSelector(selectLoading)
  const [useHeatMap, setUseHeatMap] = useState(true) // Default to heat map for better visualization
  
  // Fifth Ward Houston coordinates - centered on Fifth Ward neighborhood
  const fifthWardCenter = [29.77674000139737, -95.32701175952177]

  // Dark theme tile layer (CartoDB Dark)
  const darkTileLayer = {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    minZoom: 10
  }

  // Light theme tile layer (CartoDB Light)
  const lightTileLayer = {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    minZoom: 10
  }

  const currentTileLayer = isDark ? darkTileLayer : lightTileLayer

  return (
    <div className="h-full w-full min-h-0 relative z-10" style={{ pointerEvents: 'auto' }}>
      <MapContainer
        center={fifthWardCenter}
        zoom={14}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        boxZoom={true}
        keyboard={true}
        preferCanvas={false}
        worldCopyJump={false}
        attributionControl={false}
      >
        <TileLayer
          attribution={currentTileLayer.attribution}
          url={currentTileLayer.url}
          maxZoom={currentTileLayer.maxZoom}
          minZoom={currentTileLayer.minZoom}
        />

        {/* Risk Visualization Layer - Toggle between Heat Map and Markers */}
        {results && results.length > 0 && (
          useHeatMap ? (
            <HeatMapLayer data={results} />
          ) : (
            <MarkerCluster markers={results} />
          )
        )}

        {/* Coordinate Inspection Features */}
        <CoordinateInspector />
        <RiskAssessmentPopup />
      </MapContainer>

      {/* Visualization Toggle Control */}
      {results && results.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex">
              <button
                onClick={() => setUseHeatMap(true)}
                className={`px-3 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                  useHeatMap
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Heat Map
              </button>
              <button
                onClick={() => setUseHeatMap(false)}
                className={`px-3 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                  !useHeatMap
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Markers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Heat Map Legend */}
      <HeatMapLegend isVisible={useHeatMap && results && results.length > 0} />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-800 font-medium">Processing simulation...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default FloodMap