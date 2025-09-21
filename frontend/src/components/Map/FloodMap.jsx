import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const FloodMap = () => {
  // Fifth Ward Houston coordinates
  const fifthWardCenter = [29.760, -95.365]
  const fifthWardBounds = [
    [29.745, -95.380], // Southwest corner
    [29.775, -95.350]  // Northeast corner
  ]

  return (
    <div className="h-full w-full">
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          minZoom={10}
        />
      </MapContainer>
    </div>
  )
}

export default FloodMap