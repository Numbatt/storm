// API Types
export interface CoordinatePoint {
  lat: number;
  lon: number;
}

export interface RainfallScenario {
  rainfall_mm_per_hour: number;
  duration_hours: number;
}

export interface RiskFactors {
  elevation_risk: number;
  flow_accum_risk: number;
  rainfall_factor: number;
}

export interface ScenarioInfo {
  rainfall_mm_per_hour: number;
  duration_hours: number;
  total_rainfall_mm: number;
}

export interface RiskAssessmentResponse {
  location: CoordinatePoint;
  elevation_m: number;
  flow_accumulation: number;
  risk_score: number;
  risk_level: 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  risk_level_numeric: number;
  potential_depth_mm: number;
  is_depression_area: boolean;
  factors: RiskFactors;
  scenario: ScenarioInfo;
}

export interface GridBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GridShape {
  rows: number;
  cols: number;
}

export interface PixelSize {
  x: number;
  y: number;
}

export interface ElevationStats {
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface FlowAccumStats {
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface GridMetadata {
  grid_shape: GridShape;
  pixel_size: PixelSize;
  coordinate_system?: string;
  bounds: number[]; // [minx, miny, maxx, maxy]
  bounds_latlon?: GridBounds;
  elevation_stats?: ElevationStats;
  flow_accum_stats?: FlowAccumStats;
  area_approx_km2?: number;
}

export interface HighRiskAreaStats {
  mean_risk: number;
  max_risk: number;
  min_risk: number;
}

export interface HighRiskAreaElevation {
  mean_elevation: number;
  min_elevation: number;
  max_elevation: number;
}

export interface HighRiskArea {
  area_id: number;
  pixel_count: number;
  area_approx_m2: number;
  centroid: CoordinatePoint;
  risk_stats: HighRiskAreaStats;
  elevation_stats: HighRiskAreaElevation;
}

export interface RiskDistributionCounts {
  very_low: number;
  low: number;
  moderate: number;
  high: number;
  very_high: number;
}

export interface RiskDistributionPercentages {
  very_low: number;
  low: number;
  moderate: number;
  high: number;
  very_high: number;
}

export interface RiskDistribution {
  counts: RiskDistributionCounts;
  percentages: RiskDistributionPercentages;
}

export interface OverallRiskStats {
  mean_risk: number;
  max_risk: number;
  std_risk: number;
}

export interface DepressionAreaStats {
  total_pixels: number;
  percentage: number;
}

export interface RiskStatistics {
  total_area_pixels: number;
  area_approx_km2: number;
  risk_distribution: RiskDistribution;
  overall_stats: OverallRiskStats;
  depression_areas: DepressionAreaStats;
}

export interface GridRiskResponse {
  statistics: RiskStatistics;
  high_risk_areas: HighRiskArea[];
  scenario: ScenarioInfo;
}

export interface TieredHighRiskArea {
  area_id: string;
  tier: string; // 'very_high', 'high', 'moderate', 'low'
  pixel_count: number;
  area_approx_m2: number;
  centroid: CoordinatePoint;
  risk_stats: HighRiskAreaStats;
  elevation_stats: HighRiskAreaElevation;
  // Enhanced clustering data
  flow_accumulation?: number; // Average flow accumulation in this area
  is_river_area?: boolean; // Whether this area is near a river channel
  is_depression?: boolean; // Whether this area is a depression
  cluster_id?: string; // ID for clustered areas
  affected_area_km2?: number; // Total area affected by this risk zone
}

export interface TieredRiskAreasResponse {
  very_high: TieredHighRiskArea[];
  high: TieredHighRiskArea[];
  moderate: TieredHighRiskArea[];
  low: TieredHighRiskArea[];
  scenario: ScenarioInfo;
  total_areas_by_tier: Record<string, number>;
}

// Enhanced clustering configuration
export interface ClusteringConfig {
  minDistance: number; // Minimum distance between markers (meters)
  riverProximityThreshold: number; // Flow accumulation threshold for river areas
  riverClusteringDistance: number; // Closer clustering distance for river areas (meters)
  inlandClusteringDistance: number; // Wider clustering distance for inland areas (meters)
  maxMarkersPerKm2: number; // Maximum markers per square kilometer
  depressionBonus: number; // Extra clustering for depression areas
}

export interface PointElevationResponse {
  location: CoordinatePoint;
  elevation_m?: number;
  flow_accumulation?: number;
  within_bounds: boolean;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  grid_loaded: boolean;
  data_files_available: string[];
  system_info: Record<string, any>;
}

// UI State Types
export interface MapState {
  center: [number, number];
  zoom: number;
  bounds?: GridBounds;
}

export interface ControlsState {
  rainfall_mm_per_hour: number;
  duration_hours: number;
  showHighRiskAreas: boolean;
  riskThreshold: number;
  // New tiered controls
  useTieredRiskAreas: boolean;
  enabledRiskTiers: {
    very_high: boolean;
    high: boolean;
    moderate: boolean;
    low: boolean;
  };
  maxAreasPerTier: number;
  runAssessment: boolean;
}

export interface InspectorState {
  isOpen: boolean;
  location?: CoordinatePoint;
  data?: RiskAssessmentResponse | PointElevationResponse;
  loading: boolean;
}

// Color and styling
export interface RiskColorMapping {
  VERY_LOW: string;
  LOW: string;
  MODERATE: string;
  HIGH: string;
  VERY_HIGH: string;
}

export interface LegendItem {
  label: string;
  color: string;
  value?: number;
}

// Error handling
export interface APIError {
  error: string;
  detail?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}