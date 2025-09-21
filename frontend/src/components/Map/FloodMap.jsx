import { MapContainer, TileLayer } from 'react-leaflet'
import { useSelector } from 'react-redux'
import { useTheme } from '../../contexts/ThemeContext'
import { selectResults, selectLoading } from '../../store/slices/simulationSlice'
import MarkerCluster from './MarkerCluster'
import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'

const FloodMap = () => {
  const { isDark } = useTheme()
  const results = useSelector(selectResults)
  const loading = useSelector(selectLoading)
  
  // Fifth Ward Houston coordinates
  const fifthWardCenter = [29.760, -95.365]
  const fifthWardBounds = [
    [29.745, -95.380], // Southwest corner
    [29.775, -95.350]  // Northeast corner
  ]

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
    <div className="h-full w-full min-h-0 relative">
      <MapContainer
        center={fifthWardCenter}
        zoom={14}
        maxBounds={fifthWardBounds}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={currentTileLayer.attribution}
          url={currentTileLayer.url}
          maxZoom={currentTileLayer.maxZoom}
          minZoom={currentTileLayer.minZoom}
        />

        {/* Risk Markers Layer */}
        {results && results.length > 0 && (
          <MarkerCluster markers={results} />
        )}
      </MapContainer>

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