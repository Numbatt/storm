import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import DangerMarker from '../components/DangerMarker';
import { assessGridRisk, assessTieredRiskAreas } from '../api';
import type {
  GridMetadata,
  ControlsState,
  InspectorState,
  HighRiskArea,
  TieredHighRiskArea,
  ClusteringConfig
} from '../types';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapProps {
  metadata: GridMetadata;
  controlsState: ControlsState;
  inspectorState: InspectorState;
}

// Map click handler removed - inspection functionality disabled

const LeafletMap: React.FC<LeafletMapProps> = ({
  metadata,
  controlsState,
  inspectorState
}) => {
  const [highRiskAreas, setHighRiskAreas] = useState<HighRiskArea[]>([]);
  const [tieredRiskAreas, setTieredRiskAreas] = useState<TieredHighRiskArea[]>([]);
  const [allTieredRiskAreas, setAllTieredRiskAreas] = useState<TieredHighRiskArea[]>([]);
  const [loadingRiskAreas, setLoadingRiskAreas] = useState(false);

  // Enhanced clustering configuration
  const clusteringConfig: ClusteringConfig = {
    minDistance: 100, // 100 meters minimum between markers
    riverProximityThreshold: 5000, // Flow accumulation threshold for river areas
    riverClusteringDistance: 50, // 50 meters for river areas
    inlandClusteringDistance: 150, // 150 meters for inland areas
    maxMarkersPerKm2: 10, // Maximum 10 markers per km²
    depressionBonus: 0.3 // 30% extra clustering for depression areas
  };

  // Helper function to calculate distance between two points in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  // Helper function to identify river areas based on flow accumulation
  const isRiverArea = (area: TieredHighRiskArea): boolean => {
    // Use flow accumulation data if available, otherwise estimate based on risk factors
    if (area.flow_accumulation !== undefined) {
      return area.flow_accumulation > clusteringConfig.riverProximityThreshold;
    }
    
    // Fallback: estimate based on risk factors and elevation
    // High flow accumulation risk + low elevation often indicates river proximity
    const hasHighFlowRisk = area.risk_stats.mean_risk > 0.7; // High risk often indicates flow accumulation
    const isLowElevation = area.elevation_stats.mean_elevation < 
      (metadata.elevation_stats?.mean_elevation || 20); // Below average elevation
    
    return hasHighFlowRisk && isLowElevation;
  };

  // Helper function to identify depression areas
  const isDepressionArea = (area: TieredHighRiskArea): boolean => {
    // Areas with significantly lower elevation than surroundings
    const elevationThreshold = (metadata.elevation_stats?.mean_elevation || 20) - 3; // 3m below mean
    return area.elevation_stats.mean_elevation < elevationThreshold;
  };

  // Enhanced area enrichment with geographic context
  const enrichRiskArea = (area: TieredHighRiskArea): TieredHighRiskArea => {
    return {
      ...area,
      is_river_area: isRiverArea(area),
      is_depression: isDepressionArea(area),
      affected_area_km2: area.area_approx_m2 / 1000000, // Convert m² to km²
      cluster_id: area.area_id // Initialize cluster_id
    };
  };

  // Simple clustering function to group nearby markers
  const clusterAreas = (areas: HighRiskArea[], distanceThresholdKm: number = 0.1): HighRiskArea[] => {
    if (areas.length === 0) return areas;

    const clustered: HighRiskArea[] = [];
    const processed = new Set<string>();

    areas.forEach(area => {
      if (processed.has(area.area_id)) return;

      // Find nearby areas
      const cluster = areas.filter(otherArea => {
        if (processed.has(otherArea.area_id) || area.area_id === otherArea.area_id) return false;

        // Calculate distance between centroids
        const latDiff = area.centroid.lat - otherArea.centroid.lat;
        const lonDiff = area.centroid.lon - otherArea.centroid.lon;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Rough km conversion

        return distance < distanceThresholdKm;
      });

      if (cluster.length > 0) {
        // Create a merged cluster area
        const allAreas = [area, ...cluster];
        const totalPixels = allAreas.reduce((sum, a) => sum + a.pixel_count, 0);
        const totalAreaM2 = allAreas.reduce((sum, a) => sum + a.area_approx_m2, 0);
        const avgRisk = allAreas.reduce((sum, a) => sum + a.risk_stats.mean_risk * a.pixel_count, 0) / totalPixels;

        const mergedArea: HighRiskArea = {
          ...area,
          area_id: `cluster_${area.area_id}`,
          pixel_count: totalPixels,
          area_approx_m2: totalAreaM2,
          risk_stats: {
            ...area.risk_stats,
            mean_risk: avgRisk,
            min_risk: Math.min(...allAreas.map(a => a.risk_stats.min_risk)),
            max_risk: Math.max(...allAreas.map(a => a.risk_stats.max_risk))
          }
        };

        clustered.push(mergedArea);
        allAreas.forEach(a => processed.add(a.area_id));
      } else {
        clustered.push(area);
        processed.add(area.area_id);
      }
    });

    return clustered;
  };

  // Enhanced clustering function for tiered areas with geographic awareness
  const smartClusterTieredAreas = (areas: TieredHighRiskArea[]): TieredHighRiskArea[] => {
    if (areas.length === 0) return areas;

    // First, enrich all areas with geographic context
    const enrichedAreas = areas.map(enrichRiskArea);
    
    // Separate areas by geographic type for different clustering strategies
    const riverAreas = enrichedAreas.filter(area => area.is_river_area);
    const inlandAreas = enrichedAreas.filter(area => !area.is_river_area);
    
    console.log(`Clustering ${riverAreas.length} river areas and ${inlandAreas.length} inland areas`);

    // Apply different clustering strategies
    const clusteredRiverAreas = clusterRiverAreas(riverAreas);
    const clusteredInlandAreas = clusterInlandAreas(inlandAreas);
    
    // Combine and sort by risk level
    const allClustered = [...clusteredRiverAreas, ...clusteredInlandAreas];
    
    console.log(`After clustering: ${allClustered.length} total areas (${clusteredRiverAreas.length} river, ${clusteredInlandAreas.length} inland)`);
    
    return allClustered;
  };

  // Clustering for river areas - closer spacing, focus on flood-prone sections
  const clusterRiverAreas = (areas: TieredHighRiskArea[]): TieredHighRiskArea[] => {
    if (areas.length === 0) return areas;

    const clustered: TieredHighRiskArea[] = [];
    const processed = new Set<string>();

    areas.forEach(area => {
      if (processed.has(area.area_id)) return;

      // Find nearby river areas of the same tier with closer distance
      const cluster = areas.filter(otherArea => {
        if (processed.has(otherArea.area_id) || area.area_id === otherArea.area_id) return false;
        if (area.tier !== otherArea.tier) return false;

        const distance = calculateDistance(
          area.centroid.lat, area.centroid.lon,
          otherArea.centroid.lat, otherArea.centroid.lon
        );

        return distance < clusteringConfig.riverClusteringDistance;
      });

      if (cluster.length > 0) {
        const mergedArea = createMergedCluster([area, ...cluster], 'river');
        clustered.push(mergedArea);
        [area, ...cluster].forEach(a => processed.add(a.area_id));
      } else {
        clustered.push(area);
        processed.add(area.area_id);
      }
    });

    return clustered;
  };

  // Clustering for inland areas - wider spacing, focus on depression areas
  const clusterInlandAreas = (areas: TieredHighRiskArea[]): TieredHighRiskArea[] => {
    if (areas.length === 0) return areas;

    const clustered: TieredHighRiskArea[] = [];
    const processed = new Set<string>();

    areas.forEach(area => {
      if (processed.has(area.area_id)) return;

      // Find nearby inland areas with wider distance
      const cluster = areas.filter(otherArea => {
        if (processed.has(otherArea.area_id) || area.area_id === otherArea.area_id) return false;
        if (area.tier !== otherArea.tier) return false;

        const distance = calculateDistance(
          area.centroid.lat, area.centroid.lon,
          otherArea.centroid.lat, otherArea.centroid.lon
        );

        // Apply depression bonus for closer clustering
        let clusteringDistance = clusteringConfig.inlandClusteringDistance;
        if (area.is_depression || otherArea.is_depression) {
          clusteringDistance *= (1 + clusteringConfig.depressionBonus);
        }

        return distance < clusteringDistance;
      });

      if (cluster.length > 0) {
        const mergedArea = createMergedCluster([area, ...cluster], 'inland');
        clustered.push(mergedArea);
        [area, ...cluster].forEach(a => processed.add(a.area_id));
      } else {
        clustered.push(area);
        processed.add(area.area_id);
      }
    });

    return clustered;
  };

  // Helper function to create merged cluster areas
  const createMergedCluster = (areas: TieredHighRiskArea[], clusterType: string): TieredHighRiskArea => {
    const totalPixels = areas.reduce((sum, a) => sum + a.pixel_count, 0);
    const totalAreaM2 = areas.reduce((sum, a) => sum + a.area_approx_m2, 0);
    const avgRisk = areas.reduce((sum, a) => sum + a.risk_stats.mean_risk * a.pixel_count, 0) / totalPixels;
    
    // Calculate weighted centroid
    const weightedLat = areas.reduce((sum, a) => sum + a.centroid.lat * a.pixel_count, 0) / totalPixels;
    const weightedLon = areas.reduce((sum, a) => sum + a.centroid.lon * a.pixel_count, 0) / totalPixels;

    const mergedArea: TieredHighRiskArea = {
      ...areas[0],
      area_id: `cluster_${clusterType}_${areas[0].area_id}`,
      pixel_count: totalPixels,
      area_approx_m2: totalAreaM2,
      centroid: { lat: weightedLat, lon: weightedLon },
      risk_stats: {
        ...areas[0].risk_stats,
        mean_risk: avgRisk,
        min_risk: Math.min(...areas.map(a => a.risk_stats.min_risk)),
        max_risk: Math.max(...areas.map(a => a.risk_stats.max_risk))
      },
      cluster_id: `cluster_${clusterType}_${areas[0].area_id}`,
      affected_area_km2: totalAreaM2 / 1000000
    };

    return mergedArea;
  };

  // Calculate map center and bounds from metadata
  const getMapBounds = () => {
    if (!metadata.bounds_latlon) {
      return {
        center: [29.76, -95.32] as [number, number],
        bounds: undefined
      };
    }

    const bounds = metadata.bounds_latlon;
    const center: [number, number] = [
      (bounds.north + bounds.south) / 2,
      (bounds.east + bounds.west) / 2
    ];

    return { center, bounds };
  };

  const { center, bounds } = getMapBounds();

  // Load all risk areas when assessment is triggered (only once)
  useEffect(() => {
    if (!controlsState.runAssessment) {
      // Clear data when assessment is reset
      setAllTieredRiskAreas([]);
      setTieredRiskAreas([]);
      setHighRiskAreas([]);
      return;
    }

    if (controlsState.useTieredRiskAreas) {
      loadAllTieredRiskAreas();
      setHighRiskAreas([]); // Clear legacy areas
    } else if (controlsState.showHighRiskAreas) {
      loadHighRiskAreas();
      setTieredRiskAreas([]); // Clear tiered areas
    } else {
      setHighRiskAreas([]);
      setTieredRiskAreas([]);
    }
  }, [
    controlsState.runAssessment,
    controlsState.rainfall_mm_per_hour,
    controlsState.duration_hours,
    controlsState.riskThreshold,
    controlsState.maxAreasPerTier,
    controlsState.useTieredRiskAreas,
    controlsState.showHighRiskAreas
  ]);

  // Filter displayed risk areas based on enabled tiers (no API calls)
  useEffect(() => {
    if (!controlsState.useTieredRiskAreas || !allTieredRiskAreas.length) return;

    const enabledTiers = Object.keys(controlsState.enabledRiskTiers).filter(
      tier => controlsState.enabledRiskTiers[tier as keyof typeof controlsState.enabledRiskTiers]
    );

    const filteredAreas = allTieredRiskAreas.filter(area => 
      enabledTiers.includes(area.tier)
    );

    // Apply smart clustering to reduce visual clutter
    const clusteredAreas = smartClusterTieredAreas(filteredAreas);
    setTieredRiskAreas(clusteredAreas);
  }, [controlsState.enabledRiskTiers, allTieredRiskAreas, controlsState.useTieredRiskAreas]);

  const loadHighRiskAreas = async () => {
    if (loadingRiskAreas) return;

    try {
      setLoadingRiskAreas(true);

      const rainfallScenario = {
        rainfall_mm_per_hour: controlsState.rainfall_mm_per_hour,
        duration_hours: controlsState.duration_hours
      };

      const response = await assessGridRisk(rainfallScenario, controlsState.riskThreshold);
      const clusteredAreas = clusterAreas(response.high_risk_areas, 0.05); // 50m clustering
      setHighRiskAreas(clusteredAreas);

      console.log(`Loaded ${response.high_risk_areas.length} high-risk areas, clustered to ${clusteredAreas.length}`);

    } catch (error) {
      console.error('Error loading high-risk areas:', error);
      setHighRiskAreas([]);
    } finally {
      setLoadingRiskAreas(false);
    }
  };

  const loadAllTieredRiskAreas = async () => {
    if (loadingRiskAreas) return;

    try {
      setLoadingRiskAreas(true);

      const rainfallScenario = {
        rainfall_mm_per_hour: controlsState.rainfall_mm_per_hour,
        duration_hours: controlsState.duration_hours
      };

      // Load ALL tiers regardless of what's currently enabled
      const allTiers = ['very_high', 'high', 'moderate', 'low'];

      const response = await assessTieredRiskAreas(
        rainfallScenario,
        allTiers,
        controlsState.maxAreasPerTier
      );

      // Flatten all tiers into a single array
      const allAreas: TieredHighRiskArea[] = [];
      allTiers.forEach(tier => {
        if (response[tier as keyof typeof response] && Array.isArray(response[tier as keyof typeof response])) {
          allAreas.push(...(response[tier as keyof typeof response] as TieredHighRiskArea[]));
        }
      });

      // Store all areas for filtering later
      setAllTieredRiskAreas(allAreas);

      console.log(`Loaded ${allAreas.length} tiered risk areas across all tiers`);

    } catch (error) {
      console.error('Error loading all tiered risk areas:', error);
      setAllTieredRiskAreas([]);
    } finally {
      setLoadingRiskAreas(false);
    }
  };

  const loadTieredRiskAreas = async () => {
    if (loadingRiskAreas) return;

    try {
      setLoadingRiskAreas(true);

      const rainfallScenario = {
        rainfall_mm_per_hour: controlsState.rainfall_mm_per_hour,
        duration_hours: controlsState.duration_hours
      };

      // Get enabled tiers
      const enabledTiers = Object.keys(controlsState.enabledRiskTiers).filter(
        tier => controlsState.enabledRiskTiers[tier as keyof typeof controlsState.enabledRiskTiers]
      );

      const response = await assessTieredRiskAreas(
        rainfallScenario,
        enabledTiers,
        controlsState.maxAreasPerTier
      );

      // Flatten all enabled tiers into a single array
      const allAreas: TieredHighRiskArea[] = [];
      enabledTiers.forEach(tier => {
        if (response[tier as keyof typeof response] && Array.isArray(response[tier as keyof typeof response])) {
          allAreas.push(...(response[tier as keyof typeof response] as TieredHighRiskArea[]));
        }
      });

      // Apply clustering to reduce visual clutter
      const clusteredAreas = clusterTieredAreas(allAreas, 0.05); // 50m clustering
      setTieredRiskAreas(clusteredAreas);

      console.log(`Loaded ${allAreas.length} tiered risk areas across ${enabledTiers.length} tiers, clustered to ${clusteredAreas.length}`);

    } catch (error) {
      console.error('Error loading tiered risk areas:', error);
      setTieredRiskAreas([]);
    } finally {
      setLoadingRiskAreas(false);
    }
  };

  // Create bounds for fitting map if available
  const leafletBounds = bounds ? L.latLngBounds(
    [bounds.south, bounds.west],
    [bounds.north, bounds.east]
  ) : undefined;

  return (
    <MapContainer
      center={center}
      zoom={leafletBounds ? undefined : 14}
      bounds={leafletBounds}
      boundsOptions={{ padding: [20, 20] }}
      className="map-container"
      zoomControl={true}
      attributionControl={true}
    >
      {/* Base tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Satellite overlay option */}
      <TileLayer
        attribution='Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
        url="https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
        opacity={0.3}
      />

      {/* Map click handler disabled */}

      {/* Legacy high-risk area markers */}
      {!controlsState.useTieredRiskAreas && highRiskAreas.map((area) => (
        <DangerMarker
          key={area.area_id}
          area={area}
        />
      ))}

      {/* Tiered risk area markers */}
      {controlsState.useTieredRiskAreas && tieredRiskAreas.map((area) => (
        <DangerMarker
          key={area.area_id}
          area={area}
          tier={area.tier}
        />
      ))}

      {/* Loading indicator for risk areas */}
      {loadingRiskAreas && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-1000">
          <div className="bg-white bg-opacity-95 rounded-lg p-6 shadow-xl border border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div>
                <div className="text-base font-medium text-gray-800">
                  {controlsState.useTieredRiskAreas ? 'Analyzing tiered risk areas...' : 'Loading high-risk areas...'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Processing flood risk calculations
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map attribution */}
      <div className="leaflet-bottom leaflet-right">
        <div className="leaflet-control leaflet-control-attribution">
          <span>
            Ponding Twin • Data: USGS • Grid: {metadata.grid_shape.cols}×{metadata.grid_shape.rows} @ {metadata.pixel_size.x.toFixed(1)}m
          </span>
        </div>
      </div>
    </MapContainer>
  );
};

export default LeafletMap;