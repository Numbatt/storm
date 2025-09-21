import { MapContainer, TileLayer } from 'react-leaflet'
import { useTheme } from '../../contexts/ThemeContext'
import 'leaflet/dist/leaflet.css'

const FloodMap = () => {
  const { isDark } = useTheme()
  
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
      >
        <TileLayer
          attribution={currentTileLayer.attribution}
          url={currentTileLayer.url}
          maxZoom={currentTileLayer.maxZoom}
          minZoom={currentTileLayer.minZoom}
        />
      </MapContainer>
    </div>
  )
}

export default FloodMap