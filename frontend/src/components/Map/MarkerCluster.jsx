import MarkerClusterGroup from 'react-leaflet-cluster'
import RiskMarker from './RiskMarker'

const MarkerCluster = ({ markers = [] }) => {
  if (!markers || markers.length === 0) {
    return null
  }

  // Create custom cluster icon based on risk levels in cluster
  const createClusterCustomIcon = (cluster) => {
    const childMarkers = cluster.getAllChildMarkers()
    const riskCounts = childMarkers.reduce((acc, marker) => {
      const riskLevel = marker.options.riskLevel || 'LOW'
      acc[riskLevel] = (acc[riskLevel] || 0) + 1
      return acc
    }, {})

    // Determine dominant risk level
    let dominantRisk = 'LOW'
    let maxCount = 0

    Object.entries(riskCounts).forEach(([risk, count]) => {
      if (count > maxCount) {
        maxCount = count
        dominantRisk = risk
      }
    })

    // Set cluster color based on dominant risk
    let clusterColor = '#16a34a' // Green for LOW
    if (dominantRisk === 'HIGH') {
      clusterColor = '#dc2626' // Red
    } else if (dominantRisk === 'MODERATE') {
      clusterColor = '#f59e0b' // Yellow/Orange
    }

    const childCount = cluster.getChildCount()

    return L.divIcon({
      html: `
        <div class="cluster-marker" style="
          background-color: ${clusterColor};
          color: white;
          border: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${childCount}
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: L.point(40, 40, true),
    })
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={createClusterCustomIcon}
      showCoverageOnHover={false}
      spiderfyOnMaxZoom={true}
      zoomToBoundsOnClick={true}
      maxClusterRadius={80}
      disableClusteringAtZoom={16}
    >
      {markers.map((marker) => (
        <RiskMarker
          key={marker.id}
          marker={marker}
        />
      ))}
    </MarkerClusterGroup>
  )
}

export default MarkerCluster