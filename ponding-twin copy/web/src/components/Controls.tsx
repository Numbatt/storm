import React from 'react';
import type { ControlsState, GridMetadata } from '../types';

interface ControlsProps {
  state: ControlsState;
  onChange: (newState: Partial<ControlsState>) => void;
  metadata: GridMetadata;
}

const Controls: React.FC<ControlsProps> = ({ state, onChange, metadata }) => {
  const handleRainfallChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ rainfall_mm_per_hour: parseFloat(e.target.value), runAssessment: false });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ duration_hours: parseFloat(e.target.value), runAssessment: false });
  };

  const handleShowHighRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ showHighRiskAreas: e.target.checked });
  };

  const handleRiskThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ riskThreshold: parseFloat(e.target.value) });
  };

  const totalRainfall = state.rainfall_mm_per_hour * state.duration_hours;

  return (
    <div className="control-panel">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Rainfall Scenario</h3>

      {/* Rainfall intensity */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-800 mb-3">
          Rainfall Intensity: <span className="text-blue-600 font-semibold">{state.rainfall_mm_per_hour} mm/hr</span>
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={state.rainfall_mm_per_hour}
          onChange={handleRainfallChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Light (5)</span>
          <span>Moderate (25)</span>
          <span>Heavy (50)</span>
          <span>Extreme (100)</span>
        </div>
      </div>

      {/* Duration */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-800 mb-3">
          Duration: <span className="text-blue-600 font-semibold">{state.duration_hours} hours</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="6"
          step="0.5"
          value={state.duration_hours}
          onChange={handleDurationChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>30min</span>
          <span>2hr</span>
          <span>4hr</span>
          <span>6hr</span>
        </div>
      </div>

      {/* Total rainfall display */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="text-sm font-medium text-gray-700">Total Rainfall</div>
        <div className="text-2xl font-bold text-blue-700">
          {totalRainfall.toFixed(1)} mm
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {totalRainfall < 25 ? 'Light rain event' :
           totalRainfall < 50 ? 'Moderate rain event' :
           totalRainfall < 100 ? 'Heavy rain event' : 'Extreme rain event'}
        </div>
      </div>

      {/* Risk Areas Display Mode */}
      <div className="mb-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Areas Display</h4>

        {/* Toggle between legacy and tiered mode */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={state.useTieredRiskAreas}
              onChange={(e) => onChange({ useTieredRiskAreas: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Use Smart Tiered Display</span>
          </label>
        </div>

        {/* Tiered Risk Controls */}
        {state.useTieredRiskAreas ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-600 mb-2">Select risk levels to display:</div>

            {/* Very High Risk */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.enabledRiskTiers.very_high}
                onChange={(e) => onChange({
                  enabledRiskTiers: { ...state.enabledRiskTiers, very_high: e.target.checked }
                })}
                className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-red-600 rounded mr-2"></span>
                Very High Risk (80-100%)
              </span>
            </label>

            {/* High Risk */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.enabledRiskTiers.high}
                onChange={(e) => onChange({
                  enabledRiskTiers: { ...state.enabledRiskTiers, high: e.target.checked }
                })}
                className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-orange-400 rounded mr-2"></span>
                High Risk (60-80%)
              </span>
            </label>

            {/* Moderate Risk */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.enabledRiskTiers.moderate}
                onChange={(e) => onChange({
                  enabledRiskTiers: { ...state.enabledRiskTiers, moderate: e.target.checked }
                })}
                className="rounded border-gray-300 text-yellow-600 shadow-sm focus:border-yellow-300 focus:ring focus:ring-yellow-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-yellow-300 rounded mr-2"></span>
                Moderate Risk (40-60%)
              </span>
            </label>

            {/* Low Risk */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.enabledRiskTiers.low}
                onChange={(e) => onChange({
                  enabledRiskTiers: { ...state.enabledRiskTiers, low: e.target.checked }
                })}
                className="rounded border-gray-300 text-teal-600 shadow-sm focus:border-teal-300 focus:ring focus:ring-teal-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                <span className="inline-block w-3 h-3 bg-teal-400 rounded mr-2"></span>
                Low Risk (20-40%)
              </span>
            </label>
          </div>
        ) : (
          /* Legacy single threshold mode */
          <div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={state.showHighRiskAreas}
                  onChange={handleShowHighRiskChange}
                  className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Show High-Risk Areas</span>
              </label>
            </div>

            {/* Risk threshold slider (only shown when high-risk areas are enabled) */}
            {state.showHighRiskAreas && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Threshold: {(state.riskThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="0.9"
                  step="0.1"
                  value={state.riskThreshold}
                  onChange={handleRiskThresholdChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (30%)</span>
                  <span>High (90%)</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Study Area Info</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Grid: {metadata.grid_shape.cols} × {metadata.grid_shape.rows} cells</div>
          <div>Resolution: {metadata.pixel_size.x.toFixed(1)}m</div>
          {metadata.elevation_stats && (
            <div>
              Elevation: {metadata.elevation_stats.min.toFixed(1)}m - {metadata.elevation_stats.max.toFixed(1)}m
            </div>
          )}
          {metadata.bounds_latlon && (
            <div>
              Area: ~{((metadata.grid_shape.cols * metadata.grid_shape.rows *
                       metadata.pixel_size.x * metadata.pixel_size.y) / 1e6).toFixed(1)} km²
            </div>
          )}
        </div>
      </div>

      {/* Run Assessment Button */}
      <div className="mt-6">
        <button
          onClick={() => onChange({ runAssessment: !state.runAssessment })}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors duration-200 ${
            state.runAssessment 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {state.runAssessment ? 'Assessment Running...' : 'Run Assessment'}
        </button>
        <div className="text-xs text-gray-500 mt-2 text-center">
          Click to analyze flood risk with current parameters
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600">
          <strong>How to use:</strong><br />
          • Adjust rainfall scenario above<br />
          • Click "Run Assessment" to update the map<br />
          • {state.useTieredRiskAreas ?
              'Toggle specific risk tiers to focus on areas of concern' :
              'Toggle high-risk areas to see vulnerable zones'}<br />
          • Larger bubbles indicate higher risk levels<br />
          • {state.useTieredRiskAreas && 'Different colors represent different risk levels'}
        </div>
      </div>
    </div>
  );
};

export default Controls;