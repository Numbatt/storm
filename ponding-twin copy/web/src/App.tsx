import React, { useState, useEffect } from 'react';
import LeafletMap from './map/LeafletMap';
import Controls from './components/Controls';
import Legend from './components/Legend';
import Inspector from './components/Inspector';
import { getMetadata, healthCheck } from './api';
import type {
  GridMetadata,
  ControlsState,
  InspectorState,
  CoordinatePoint,
  RiskAssessmentResponse,
  PointElevationResponse
} from './types';

function App() {
  const [metadata, setMetadata] = useState<GridMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsState, setControlsState] = useState<ControlsState>({
    rainfall_mm_per_hour: 25,
    duration_hours: 1,
    showHighRiskAreas: false,
    riskThreshold: 0.6,
    // New tiered controls
    useTieredRiskAreas: true, // Enable by default
    enabledRiskTiers: {
      very_high: true,
      high: true,
      moderate: false,
      low: false
    },
    maxAreasPerTier: 50,
    runAssessment: false
  });
  const [inspectorState, setInspectorState] = useState<InspectorState>({
    isOpen: false,
    loading: false
  });

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check API health
        const health = await healthCheck();
        if (!health.grid_loaded) {
          throw new Error('Grid data not loaded. Please run preprocessing first.');
        }

        // Get grid metadata
        const meta = await getMetadata();
        setMetadata(meta);

        console.log('App initialized successfully');
        console.log('Grid metadata:', meta);

      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize application');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle inspector close (keeping for future use)
  const handleInspectorClose = () => {
    setInspectorState({
      isOpen: false,
      loading: false
    });
  };

  // Handle controls change
  const handleControlsChange = (newState: Partial<ControlsState>) => {
    setControlsState(prev => ({ ...prev, ...newState }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Ponding Twin...</h2>
          <p className="text-gray-500 mt-2">Initializing flood risk assessment system</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="font-bold text-lg mb-2">Initialization Error</h2>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">No grid data available</h2>
          <p className="text-gray-500 mt-2">Please check if preprocessing has been completed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative">
      {/* Main map container */}
      <LeafletMap
        metadata={metadata}
        controlsState={controlsState}
        inspectorState={inspectorState}
      />

      {/* Controls panel */}
      <div className="absolute top-24 left-4 z-1000">
        <Controls
          state={controlsState}
          onChange={handleControlsChange}
          metadata={metadata}
        />
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-1000">
        <Legend />
      </div>

      {/* Inspector panel - disabled for now */}

      {/* Header with title */}
      <div className="absolute top-0 left-0 right-0 bg-white bg-opacity-95 shadow-lg border-b border-gray-200 backdrop-blur-sm z-500">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Ponding Twin</h1>
          <p className="text-gray-700 text-sm font-medium">
            Flood Risk Assessment • Greater Fifth Ward, Houston
            {metadata.area_approx_km2 && (
              <span className="ml-2 text-blue-600">
                ({metadata.area_approx_km2.toFixed(1)} km² study area)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;