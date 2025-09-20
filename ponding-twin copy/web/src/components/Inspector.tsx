import React, { useEffect } from 'react';
import { getPointElevation, assessRisk } from '../api';
import type { InspectorState, RainfallScenario, RiskAssessmentResponse, PointElevationResponse } from '../types';

interface InspectorProps {
  state: InspectorState;
  onClose: () => void;
  rainfallScenario: RainfallScenario;
}

const Inspector: React.FC<InspectorProps> = ({ state, onClose, rainfallScenario }) => {
  // Fetch data when location changes
  useEffect(() => {
    if (state.location && state.loading) {
      fetchLocationData();
    }
  }, [state.location, rainfallScenario]);

  const fetchLocationData = async () => {
    if (!state.location) return;

    try {
      // First get basic elevation data
      const elevationData = await getPointElevation(
        state.location.lat,
        state.location.lon
      );

      if (!elevationData.within_bounds) {
        onClose();
        return;
      }

      // Then get risk assessment
      const riskData = await assessRisk(state.location, rainfallScenario);

      // Use risk data as it includes elevation info
      state.data = riskData;
    } catch (error) {
      console.error('Error fetching location data:', error);
      // Fallback to elevation data only
      try {
        const elevationData = await getPointElevation(
          state.location.lat,
          state.location.lon
        );
        state.data = elevationData;
      } catch (fallbackError) {
        console.error('Error fetching elevation data:', fallbackError);
      }
    }
  };

  const isRiskData = (data: any): data is RiskAssessmentResponse => {
    return data && 'risk_score' in data;
  };

  const getRiskColor = (riskLevel: string) => {
    const colors = {
      'VERY_LOW': '#1a9850',
      'LOW': '#66c2a5',
      'MODERATE': '#ffffbf',
      'HIGH': '#feb48b',
      'VERY_HIGH': '#d73027'
    };
    return colors[riskLevel as keyof typeof colors] || '#gray';
  };

  const formatCoordinate = (value: number, isLat: boolean) => {
    const abs = Math.abs(value);
    const direction = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${abs.toFixed(6)}° ${direction}`;
  };

  return (
    <div className="control-panel max-w-xs">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Location Inspector</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      {state.loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}

      {state.data && (
        <div className="space-y-4">
          {/* Location Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-700 mb-2">Location</h4>
            <div className="text-sm text-gray-600">
              <div>Lat: {formatCoordinate(state.location!.lat, true)}</div>
              <div>Lon: {formatCoordinate(state.location!.lon, false)}</div>
            </div>
          </div>

          {/* Elevation Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-700 mb-2">Elevation</h4>
            <div className="text-lg font-semibold text-blue-700">
              {state.data.elevation_m?.toFixed(1) || 'N/A'} m
            </div>
            {state.data.flow_accumulation && (
              <div className="text-sm text-gray-600 mt-1">
                Flow Accumulation: {state.data.flow_accumulation.toLocaleString()}
              </div>
            )}
          </div>

          {/* Risk Assessment */}
          {isRiskData(state.data) && (
            <div className="bg-red-50 rounded-lg p-3">
              <h4 className="font-medium text-gray-700 mb-2">Flood Risk Assessment</h4>
              
              {/* Risk Level */}
              <div className="flex items-center mb-2">
                <div 
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: getRiskColor(state.data.risk_level) }}
                ></div>
                <span className="font-semibold text-gray-800">
                  {state.data.risk_level.replace('_', ' ')}
                </span>
              </div>

              {/* Risk Score */}
              <div className="text-sm text-gray-600 mb-2">
                Risk Score: {(state.data.risk_score * 100).toFixed(1)}%
              </div>

              {/* Potential Water Depth */}
              <div className="text-sm text-gray-600 mb-2">
                Potential Water Depth: {state.data.potential_depth_mm.toFixed(1)} mm
              </div>

              {/* Risk Factors */}
              <div className="text-sm text-gray-600">
                <div className="mb-1">
                  Elevation Risk: {(state.data.factors.elevation_risk * 100).toFixed(1)}%
                </div>
                <div className="mb-1">
                  Flow Accumulation Risk: {(state.data.factors.flow_accum_risk * 100).toFixed(1)}%
                </div>
                <div className="mb-1">
                  Rainfall Factor: {(state.data.factors.rainfall_factor * 100).toFixed(1)}%
                </div>
              </div>

              {/* Depression Area */}
              {state.data.is_depression_area && (
                <div className="mt-2 text-xs text-orange-600 font-medium">
                  ⚠️ Depression Area (Higher Risk)
                </div>
              )}

              {/* Rainfall Scenario */}
              <div className="mt-3 pt-2 border-t border-red-200">
                <div className="text-xs text-gray-500">
                  <div>Rainfall: {state.data.scenario.rainfall_mm_per_hour} mm/hr</div>
                  <div>Duration: {state.data.scenario.duration_hours} hrs</div>
                  <div>Total: {state.data.scenario.total_rainfall_mm.toFixed(1)} mm</div>
                </div>
              </div>
            </div>
          )}

          {/* Bounds Check */}
          {!state.data.within_bounds && (
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-yellow-700 text-sm">
                ⚠️ Location is outside the study area bounds
              </div>
            </div>
          )}
        </div>
      )}

      {!state.data && !state.loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📍</div>
          <div>Click on the map to inspect a location</div>
        </div>
      )}
    </div>
  );
};

export default Inspector;
