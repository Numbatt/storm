#!/usr/bin/env python3
"""
Pydantic models for API request and response validation.

Defines data structures for the FastAPI endpoints including
risk assessment requests, simulation parameters, and responses.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class RiskLevelEnum(str, Enum):
    """Risk level enumeration for API responses."""
    VERY_LOW = "VERY_LOW"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


class CoordinatePoint(BaseModel):
    """Geographic coordinate point."""
    lat: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")


class RainfallScenario(BaseModel):
    """Rainfall scenario parameters."""
    rainfall_mm_per_hour: float = Field(default=25.0, ge=0, le=200,
                                       description="Rainfall intensity in mm/hour")
    duration_hours: float = Field(default=1.0, ge=0.1, le=24,
                                 description="Rainfall duration in hours")


class RiskAssessmentRequest(BaseModel):
    """Request model for point risk assessment."""
    location: CoordinatePoint
    rainfall_scenario: Optional[RainfallScenario] = None


class BulkRiskAssessmentRequest(BaseModel):
    """Request model for bulk risk assessment of multiple points."""
    locations: List[CoordinatePoint] = Field(..., max_items=100)
    rainfall_scenario: Optional[RainfallScenario] = None


class GridRiskRequest(BaseModel):
    """Request model for grid-wide risk assessment."""
    rainfall_scenario: Optional[RainfallScenario] = None
    min_risk_threshold: Optional[float] = Field(default=0.6, ge=0, le=1,
                                               description="Minimum risk score for high-risk areas")


class ElevationStats(BaseModel):
    """Elevation statistics."""
    min: float
    max: float
    mean: float
    std: float


class FlowAccumStats(BaseModel):
    """Flow accumulation statistics."""
    min: float
    max: float
    mean: float
    std: float


class GridBounds(BaseModel):
    """Grid boundary information."""
    north: float
    south: float
    east: float
    west: float


class GridShape(BaseModel):
    """Grid dimensions."""
    rows: int
    cols: int


class PixelSize(BaseModel):
    """Pixel size information."""
    x: float
    y: float


class GridMetadata(BaseModel):
    """Grid metadata response."""
    grid_shape: GridShape
    pixel_size: PixelSize
    coordinate_system: Optional[str]
    bounds: List[float]  # [minx, miny, maxx, maxy]
    bounds_latlon: Optional[GridBounds]
    elevation_stats: Optional[ElevationStats]
    flow_accum_stats: Optional[FlowAccumStats]


class RiskFactors(BaseModel):
    """Individual risk factor contributions."""
    elevation_risk: float = Field(..., ge=0, le=1)
    flow_accum_risk: float = Field(..., ge=0, le=1)
    rainfall_factor: float = Field(..., ge=0, le=1)


class ScenarioInfo(BaseModel):
    """Rainfall scenario information."""
    rainfall_mm_per_hour: float
    duration_hours: float
    total_rainfall_mm: float


class RiskAssessmentResponse(BaseModel):
    """Response model for point risk assessment."""
    location: CoordinatePoint
    elevation_m: float
    flow_accumulation: int
    risk_score: float = Field(..., ge=0, le=1)
    risk_level: RiskLevelEnum
    risk_level_numeric: int = Field(..., ge=0, le=4)
    potential_depth_mm: float
    is_depression_area: bool
    factors: RiskFactors
    scenario: ScenarioInfo


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None


class BulkRiskAssessmentResponse(BaseModel):
    """Response model for bulk risk assessment."""
    results: List[RiskAssessmentResponse]
    errors: List[Dict[str, Any]] = []
    summary: Dict[str, Any]


class HighRiskAreaStats(BaseModel):
    """Statistics for a high-risk area."""
    mean_risk: float
    max_risk: float
    min_risk: float


class HighRiskAreaElevation(BaseModel):
    """Elevation statistics for a high-risk area."""
    mean_elevation: float
    min_elevation: float
    max_elevation: float


class HighRiskArea(BaseModel):
    """Information about a high-risk area."""
    area_id: int
    pixel_count: int
    area_approx_m2: float
    centroid: CoordinatePoint
    risk_stats: HighRiskAreaStats
    elevation_stats: HighRiskAreaElevation


class RiskDistributionCounts(BaseModel):
    """Risk level distribution counts."""
    very_low: int
    low: int
    moderate: int
    high: int
    very_high: int


class RiskDistributionPercentages(BaseModel):
    """Risk level distribution percentages."""
    very_low: float
    low: float
    moderate: float
    high: float
    very_high: float


class RiskDistribution(BaseModel):
    """Risk distribution information."""
    counts: RiskDistributionCounts
    percentages: RiskDistributionPercentages


class OverallRiskStats(BaseModel):
    """Overall risk statistics."""
    mean_risk: float
    max_risk: float
    std_risk: float


class DepressionAreaStats(BaseModel):
    """Depression area statistics."""
    total_pixels: int
    percentage: float


class RiskStatistics(BaseModel):
    """Comprehensive risk statistics."""
    total_area_pixels: int
    area_approx_km2: float
    risk_distribution: RiskDistribution
    overall_stats: OverallRiskStats
    depression_areas: DepressionAreaStats


class GridRiskResponse(BaseModel):
    """Response model for grid-wide risk assessment."""
    statistics: RiskStatistics
    high_risk_areas: List[HighRiskArea]
    scenario: ScenarioInfo


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    grid_loaded: bool
    data_files_available: List[str]
    system_info: Dict[str, Any]


class PreprocessingStatus(BaseModel):
    """Preprocessing status response."""
    preprocessing_required: bool
    available_files: List[str]
    missing_files: List[str]
    last_processed: Optional[str] = None


# Additional utility models for common patterns

class PointQuery(BaseModel):
    """Simple point query model."""
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class PointElevationResponse(BaseModel):
    """Response for elevation queries."""
    location: CoordinatePoint
    elevation_m: Optional[float]
    flow_accumulation: Optional[float]
    within_bounds: bool


class ValidationError(BaseModel):
    """Validation error details."""
    field: str
    message: str
    invalid_value: Any


class APIResponse(BaseModel):
    """Generic API response wrapper."""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    validation_errors: Optional[List[ValidationError]] = None


# Configuration models

class TieredHighRiskArea(BaseModel):
    """High-risk area with tier information."""
    area_id: str
    tier: str  # 'very_high', 'high', 'moderate', 'low'
    pixel_count: int
    area_approx_m2: float
    centroid: CoordinatePoint
    risk_stats: HighRiskAreaStats
    elevation_stats: HighRiskAreaElevation


class TieredRiskAreasRequest(BaseModel):
    """Request model for tiered risk areas."""
    rainfall_scenario: Optional[RainfallScenario] = None
    max_areas_per_tier: int = Field(default=50, ge=1, le=200)
    enabled_tiers: List[str] = Field(default=['very_high', 'high'])


class TieredRiskAreasResponse(BaseModel):
    """Response model for tiered risk areas."""
    very_high: List[TieredHighRiskArea]
    high: List[TieredHighRiskArea]
    moderate: List[TieredHighRiskArea]
    low: List[TieredHighRiskArea]
    scenario: ScenarioInfo
    total_areas_by_tier: Dict[str, int]


class RiskModelConfig(BaseModel):
    """Risk model configuration."""
    drainage_coefficient: float = Field(default=0.000001, ge=0, le=0.01)
    ponding_threshold_mm: float = Field(default=50.0, ge=0, le=500)
    high_flow_accum_threshold: int = Field(default=1000, ge=1, le=100000)
    elevation_weight: float = Field(default=0.4, ge=0, le=1)
    flow_accum_weight: float = Field(default=0.3, ge=0, le=1)
    rainfall_weight: float = Field(default=0.3, ge=0, le=1)

    class Config:
        """Pydantic configuration."""
        validate_assignment = True

    def __post_init__(self):
        """Validate weights sum to 1.0."""
        total_weight = self.elevation_weight + self.flow_accum_weight + self.rainfall_weight
        if abs(total_weight - 1.0) > 0.001:
            raise ValueError("Risk factor weights must sum to 1.0")


# Export all models for easy importing
__all__ = [
    "RiskLevelEnum",
    "CoordinatePoint",
    "RainfallScenario",
    "RiskAssessmentRequest",
    "BulkRiskAssessmentRequest",
    "GridRiskRequest",
    "GridMetadata",
    "RiskAssessmentResponse",
    "ErrorResponse",
    "BulkRiskAssessmentResponse",
    "HighRiskArea",
    "RiskStatistics",
    "GridRiskResponse",
    "HealthResponse",
    "PreprocessingStatus",
    "PointQuery",
    "PointElevationResponse",
    "ValidationError",
    "APIResponse",
    "RiskModelConfig"
]