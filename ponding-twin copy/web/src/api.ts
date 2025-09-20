import axios from 'axios';
import type {
  RiskAssessmentResponse,
  GridRiskResponse,
  GridMetadata,
  PointElevationResponse,
  HealthResponse,
  CoordinatePoint,
  RainfallScenario,
  APIResponse,
  TieredRiskAreasResponse
} from './types';

// Configure axios base URL for local development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for complex risk calculations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 503) {
      throw new Error('Service temporarily unavailable. Please check if preprocessing is complete.');
    }
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error;
  }
);

// API Functions
export const healthCheck = async (): Promise<HealthResponse> => {
  const response = await api.get<HealthResponse>('/health');
  return response.data;
};

export const getMetadata = async (): Promise<GridMetadata> => {
  const response = await api.get<APIResponse<GridMetadata>>('/meta');
  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch grid metadata');
  }
  return response.data.data;
};

export const getPointElevation = async (
  lat: number,
  lon: number
): Promise<PointElevationResponse> => {
  const response = await api.get<PointElevationResponse>('/point', {
    params: { lat, lon },
  });
  return response.data;
};

export const assessRisk = async (
  location: CoordinatePoint,
  rainfallScenario?: RainfallScenario
): Promise<RiskAssessmentResponse> => {
  const response = await api.post<RiskAssessmentResponse>('/risk/assess', {
    location,
    rainfall_scenario: rainfallScenario,
  });
  return response.data;
};

export const assessBulkRisk = async (
  locations: CoordinatePoint[],
  rainfallScenario?: RainfallScenario
): Promise<RiskAssessmentResponse[]> => {
  const response = await api.post('/risk/bulk', {
    locations,
    rainfall_scenario: rainfallScenario,
  });
  return response.data.results;
};

export const assessGridRisk = async (
  rainfallScenario?: RainfallScenario,
  minRiskThreshold: number = 0.6
): Promise<GridRiskResponse> => {
  const response = await api.post<GridRiskResponse>('/risk/grid', {
    rainfall_scenario: rainfallScenario,
    min_risk_threshold: minRiskThreshold,
  });
  return response.data;
};

export const assessTieredRiskAreas = async (
  rainfallScenario?: RainfallScenario,
  enabledTiers: string[] = ['very_high', 'high'],
  maxAreasPerTier: number = 50
): Promise<TieredRiskAreasResponse> => {
  const response = await api.post<TieredRiskAreasResponse>('/risk/tiered', {
    rainfall_scenario: rainfallScenario,
    enabled_tiers: enabledTiers,
    max_areas_per_tier: maxAreasPerTier,
  });
  return response.data;
};

// Utility function to create rainfall scenario
export const createRainfallScenario = (
  rainfallMmPerHour: number,
  durationHours: number
): RainfallScenario => ({
  rainfall_mm_per_hour: rainfallMmPerHour,
  duration_hours: durationHours,
});

// Error boundary helper
export const isAPIError = (error: any): error is { message: string } => {
  return error && typeof error.message === 'string';
};

// Retry utility for failed requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Request attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError!;
};

// Batch processing utility
export const batchProcess = async <T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
};

export default api;
