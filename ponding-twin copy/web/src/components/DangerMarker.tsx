import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { HighRiskArea, TieredHighRiskArea } from '../types';

interface DangerMarkerProps {
  area: HighRiskArea | TieredHighRiskArea;
  color?: string;
  tier?: string; // For tiered risk areas
}

const DangerMarker: React.FC<DangerMarkerProps> = ({ area, color, tier }) => {
  // Create custom icon for high-risk areas
  const createDangerIcon = (size: number, color: string) => {
    return L.divIcon({
      className: 'danger-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${Math.max(8, size * 0.4)}px;
          color: white;
          font-weight: bold;
        ">
          ⚠
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  };

  // Risk level color mapping for legacy mode
  const getLegacyRiskColor = (meanRisk: number) => {
    if (meanRisk >= 0.8) return '#d73027';
    if (meanRisk >= 0.6) return '#feb48b';
    if (meanRisk >= 0.4) return '#ffffbf';
    if (meanRisk >= 0.2) return '#66c2a5';
    return '#1a9850';
  };

  // Tier-specific color mapping (tiered mode)
  const getTierColor = (tierName: string) => {
    switch (tierName) {
      case 'very_high': return '#dc2626'; // red-600
      case 'high': return '#f97316'; // orange-500
      case 'moderate': return '#eab308'; // yellow-500
      case 'low': return '#059669'; // emerald-600
      default: return '#6b7280'; // gray-500
    }
  };

  const getRiskLevelText = (meanRisk: number) => {
    if (meanRisk >= 0.8) return 'Very High';
    if (meanRisk >= 0.6) return 'High';
    if (meanRisk >= 0.4) return 'Moderate';
    if (meanRisk >= 0.2) return 'Low';
    return 'Very Low';
  };

  // Tier-specific text mapping
  const getTierText = (tierName: string) => {
    switch (tierName) {
      case 'very_high': return 'Very High';
      case 'high': return 'High';
      case 'moderate': return 'Moderate';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  };

  // Size based on tier or risk level (higher risk = bigger markers)
  const getMarkerSize = () => {
    if (tier) {
      // Tier-based sizing (more distinct sizes)
      switch (tier) {
        case 'very_high': return 36; // Largest
        case 'high': return 28;
        case 'moderate': return 22;
        case 'low': return 18; // Smallest
        default: return 16;
      }
    } else {
      // Legacy risk-based sizing
      const riskLevel = area.risk_stats.mean_risk;
      if (riskLevel >= 0.8) return 32; // Very High
      if (riskLevel >= 0.6) return 26; // High
      if (riskLevel >= 0.4) return 20; // Moderate
      if (riskLevel >= 0.2) return 16; // Low
      return 12; // Very Low
    }
  };

  const markerSize = getMarkerSize();
  const markerColor = color || (tier ? getTierColor(tier) : getLegacyRiskColor(area.risk_stats.mean_risk));
  const icon = createDangerIcon(markerSize, markerColor);

  const formatArea = (area_m2: number) => {
    if (area_m2 < 1000) {
      return `${area_m2.toFixed(0)} m²`;
    } else if (area_m2 < 1000000) {
      return `${(area_m2 / 1000).toFixed(1)} k m²`;
    } else {
      return `${(area_m2 / 1000000).toFixed(2)} km²`;
    }
  };

  return (
    <Marker
      position={[area.centroid.lat, area.centroid.lon]}
      icon={icon}
    >
      <Popup>
        <div className="p-2 min-w-48">
          <h4 className="font-semibold text-gray-800 mb-2">
            {tier ? `${getTierText(tier)} Risk Area` : `High-Risk Area`} #{area.area_id}
          </h4>

          {/* Risk Level */}
          <div className="mb-3">
            <div className="flex items-center space-x-2 mb-1">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: tier ? getTierColor(tier) : getLegacyRiskColor(area.risk_stats.mean_risk) }}
              ></div>
              <span className="font-medium">
                {tier ? getTierText(tier) : getRiskLevelText(area.risk_stats.mean_risk)} Risk
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Average: {(area.risk_stats.mean_risk * 100).toFixed(1)}%
            </div>
            {tier && (
              <div className="text-xs text-gray-500">
                Tier: {tier.replace('_', ' ')}
              </div>
            )}
          </div>

          {/* Area Information */}
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Area:</span> {formatArea(area.area_approx_m2)}
            </div>
            <div>
              <span className="font-medium">Grid Cells:</span> {area.pixel_count.toLocaleString()}
            </div>
          </div>

          {/* Geographic Context */}
          {(area as TieredHighRiskArea).is_river_area !== undefined && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">Geographic Context:</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(area as TieredHighRiskArea).is_river_area && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    🌊 Near River
                  </span>
                )}
                {(area as TieredHighRiskArea).is_depression && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                    ⬇️ Depression
                  </span>
                )}
                {(area as TieredHighRiskArea).cluster_id && (area as TieredHighRiskArea).cluster_id !== area.area_id && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    📍 Cluster
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Risk Statistics */}
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Risk Range:</span>
                <span>
                  {(area.risk_stats.min_risk * 100).toFixed(0)}% - {(area.risk_stats.max_risk * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Elevation Range:</span>
                <span>
                  {area.elevation_stats.min_elevation.toFixed(1)}m - {area.elevation_stats.max_elevation.toFixed(1)}m
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Elevation:</span>
                <span>{area.elevation_stats.mean_elevation.toFixed(1)}m</span>
              </div>
              {(area as TieredHighRiskArea).flow_accumulation !== undefined && (
                <div className="flex justify-between">
                  <span>Flow Accumulation:</span>
                  <span>{(area as TieredHighRiskArea).flow_accumulation!.toLocaleString()}</span>
                </div>
              )}
              {(area as TieredHighRiskArea).affected_area_km2 !== undefined && (
                <div className="flex justify-between">
                  <span>Affected Area:</span>
                  <span>{(area as TieredHighRiskArea).affected_area_km2!.toFixed(2)} km²</span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <div>Lat: {area.centroid.lat.toFixed(6)}°</div>
              <div>Lon: {area.centroid.lon.toFixed(6)}°</div>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default DangerMarker;