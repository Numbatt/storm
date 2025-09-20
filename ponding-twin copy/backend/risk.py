#!/usr/bin/env python3
"""
Risk assessment module for flood ponding analysis.

Implements risk models that combine elevation, flow accumulation,
and rainfall scenarios to assess flood risk.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum
from dataclasses import dataclass
from grid import Grid


class RiskLevel(Enum):
    """Flood risk level enumeration."""
    VERY_LOW = 0
    LOW = 1
    MODERATE = 2
    HIGH = 3
    VERY_HIGH = 4


@dataclass
class RiskParameters:
    """Parameters for risk assessment model."""
    rainfall_mm_per_hour: float = 25.0
    duration_hours: float = 1.0
    drainage_coefficient: float = 0.000001  # m/s drainage rate (0.0036 mm/hr)
    ponding_threshold_mm: float = 50.0   # mm of water depth for concern
    high_flow_accum_threshold: int = 1000  # cells draining to point
    elevation_weight: float = 0.4
    flow_accum_weight: float = 0.3
    rainfall_weight: float = 0.3


class FloodRiskAssessment:
    """Flood risk assessment using elevation and flow accumulation data."""

    def __init__(self, grid: Grid, params: Optional[RiskParameters] = None):
        """
        Initialize risk assessment.

        Args:
            grid: Grid object with loaded elevation and flow accumulation data
            params: Risk assessment parameters
        """
        self.grid = grid
        self.params = params or RiskParameters()

        if grid.elevation is None or grid.flow_accum is None:
            raise ValueError("Grid must have elevation and flow accumulation data loaded")

        # Pre-compute risk factors
        self._compute_base_risk_factors()

    def _compute_base_risk_factors(self) -> None:
        """Pre-compute elevation and flow accumulation risk factors."""
        # Elevation risk: higher risk in low-lying areas
        elevation_normalized = (self.grid.elevation - np.nanmin(self.grid.elevation)) / \
                              (np.nanmax(self.grid.elevation) - np.nanmin(self.grid.elevation))
        self.elevation_risk = 1.0 - elevation_normalized  # Invert: low elevation = high risk

        # Flow accumulation risk: higher risk in areas with high accumulation
        flow_accum_log = np.log1p(self.grid.flow_accum)  # log(1 + x) to handle zeros
        flow_accum_normalized = (flow_accum_log - np.nanmin(flow_accum_log)) / \
                               (np.nanmax(flow_accum_log) - np.nanmin(flow_accum_log))
        self.flow_accum_risk = flow_accum_normalized

        # Identify depression areas (potential ponding zones)
        self.depression_mask = self._identify_depressions()
        
        # Initialize cache attributes
        self._cached_risk_grid = None
        self._cache_key = None

    def _identify_depressions(self) -> np.ndarray:
        """
        Identify potential depression areas using local elevation analysis.

        Returns:
            Binary mask where 1 indicates potential depression areas
        """
        from scipy import ndimage

        # Use a simple approach: areas lower than their neighborhood
        kernel = np.ones((5, 5))
        kernel[2, 2] = 0  # Exclude center pixel

        # Compute neighborhood mean
        neighborhood_mean = ndimage.generic_filter(
            self.grid.elevation, np.nanmean, footprint=kernel, mode='constant', cval=np.nan
        )

        # Depression areas are significantly lower than their neighborhood
        elevation_diff = neighborhood_mean - self.grid.elevation
        depression_threshold = np.nanstd(elevation_diff) * 0.5

        depressions = (elevation_diff > depression_threshold) & ~np.isnan(elevation_diff)
        return depressions.astype(np.uint8)

    def invalidate_cache(self) -> None:
        """Invalidate the cached risk grid."""
        self._cached_risk_grid = None
        self._cache_key = None

    def assess_point_risk(self, lat: float, lon: float,
                         rainfall_params: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Assess flood risk at a specific point.

        Args:
            lat: Latitude in decimal degrees
            lon: Longitude in decimal degrees
            rainfall_params: Optional rainfall scenario parameters

        Returns:
            Dictionary with risk assessment results
        """
        if not self.grid.is_within_bounds(lat, lon):
            return {"error": "Point outside grid bounds"}

        # Get grid coordinates
        try:
            row, col = self.grid.latlon_to_pixel(lat, lon)
        except (ValueError, IndexError):
            return {"error": "Unable to convert coordinates"}

        # Get elevation and flow accumulation
        elevation = self.grid.get_elevation(lat, lon)
        flow_accum = self.grid.get_flow_accumulation(lat, lon)

        if elevation is None or flow_accum is None:
            return {"error": "No data available at this location"}

        # Use provided rainfall parameters or defaults
        if rainfall_params:
            rainfall_mm_hr = rainfall_params.get('rainfall_mm_per_hour', self.params.rainfall_mm_per_hour)
            duration_hr = rainfall_params.get('duration_hours', self.params.duration_hours)
        else:
            rainfall_mm_hr = self.params.rainfall_mm_per_hour
            duration_hr = self.params.duration_hours

        # Calculate potential water depth
        total_rainfall_mm = rainfall_mm_hr * duration_hr
        drainage_mm = self.params.drainage_coefficient * duration_hr * 3600 * 1000  # Convert to mm
        potential_depth_mm = max(0, total_rainfall_mm - drainage_mm)

        # Get risk factors at this location
        if 0 <= row < self.elevation_risk.shape[0] and 0 <= col < self.elevation_risk.shape[1]:
            elevation_risk = self.elevation_risk[row, col]
            flow_accum_risk = self.flow_accum_risk[row, col]
            is_depression = bool(self.depression_mask[row, col])
        else:
            elevation_risk = 0.5
            flow_accum_risk = 0.5
            is_depression = False

        # Compute composite risk score
        rainfall_factor = min(1.0, potential_depth_mm / self.params.ponding_threshold_mm)

        composite_risk = (
            self.params.elevation_weight * elevation_risk +
            self.params.flow_accum_weight * flow_accum_risk +
            self.params.rainfall_weight * rainfall_factor
        )

        # Apply depression bonus
        if is_depression:
            composite_risk = min(1.0, composite_risk * 1.2)

        # Determine risk level
        if composite_risk < 0.2:
            risk_level = RiskLevel.VERY_LOW
        elif composite_risk < 0.4:
            risk_level = RiskLevel.LOW
        elif composite_risk < 0.6:
            risk_level = RiskLevel.MODERATE
        elif composite_risk < 0.8:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.VERY_HIGH

        return {
            "location": {"lat": lat, "lon": lon},
            "elevation_m": round(elevation, 2),
            "flow_accumulation": int(flow_accum),
            "risk_score": round(composite_risk, 3),
            "risk_level": risk_level.name,
            "risk_level_numeric": risk_level.value,
            "potential_depth_mm": round(potential_depth_mm, 1),
            "is_depression_area": is_depression,
            "factors": {
                "elevation_risk": round(elevation_risk, 3),
                "flow_accum_risk": round(flow_accum_risk, 3),
                "rainfall_factor": round(rainfall_factor, 3)
            },
            "scenario": {
                "rainfall_mm_per_hour": rainfall_mm_hr,
                "duration_hours": duration_hr,
                "total_rainfall_mm": round(total_rainfall_mm, 1)
            }
        }

    def compute_risk_grid(self, rainfall_params: Optional[Dict[str, float]] = None) -> np.ndarray:
        """
        Compute risk scores for entire grid.

        Args:
            rainfall_params: Optional rainfall scenario parameters

        Returns:
            2D array of risk scores (0-1 scale)
        """
        # Use provided rainfall parameters or defaults
        if rainfall_params:
            rainfall_mm_hr = rainfall_params.get('rainfall_mm_per_hour', self.params.rainfall_mm_per_hour)
            duration_hr = rainfall_params.get('duration_hours', self.params.duration_hours)
        else:
            rainfall_mm_hr = self.params.rainfall_mm_per_hour
            duration_hr = self.params.duration_hours

        # Calculate rainfall factor
        total_rainfall_mm = rainfall_mm_hr * duration_hr
        drainage_mm = self.params.drainage_coefficient * duration_hr * 3600 * 1000
        potential_depth_mm = max(0, total_rainfall_mm - drainage_mm)
        rainfall_factor = min(1.0, potential_depth_mm / self.params.ponding_threshold_mm)

        # Compute composite risk
        composite_risk = (
            self.params.elevation_weight * self.elevation_risk +
            self.params.flow_accum_weight * self.flow_accum_risk +
            self.params.rainfall_weight * rainfall_factor
        )

        # Apply depression bonus
        depression_bonus = self.depression_mask * 0.2
        composite_risk = np.minimum(1.0, composite_risk + depression_bonus)

        return composite_risk

    def get_high_risk_areas(self, min_risk_score: float = 0.6) -> List[Dict[str, Any]]:
        """
        Identify high-risk areas across the grid.

        Args:
            min_risk_score: Minimum risk score to consider high risk

        Returns:
            List of high-risk area information
        """
        risk_grid = self.compute_risk_grid()
        high_risk_mask = risk_grid >= min_risk_score

        # Find connected components of high-risk areas
        from scipy import ndimage
        labeled_areas, num_areas = ndimage.label(high_risk_mask)

        high_risk_areas = []
        for area_id in range(1, num_areas + 1):
            area_mask = labeled_areas == area_id
            area_indices = np.where(area_mask)

            if len(area_indices[0]) < 5:  # Skip very small areas
                continue

            # Get area statistics
            area_risk_scores = risk_grid[area_mask]
            area_elevations = self.grid.elevation[area_mask]

            # Get centroid
            centroid_row = int(np.mean(area_indices[0]))
            centroid_col = int(np.mean(area_indices[1]))
            centroid_lat, centroid_lon = self.grid.pixel_to_latlon(centroid_row, centroid_col)

            high_risk_areas.append({
                "area_id": area_id,
                "pixel_count": len(area_indices[0]),
                "area_approx_m2": len(area_indices[0]) * (self.grid.georef['pixel_size_x'] ** 2),
                "centroid": {"lat": centroid_lat, "lon": centroid_lon},
                "risk_stats": {
                    "mean_risk": float(np.mean(area_risk_scores)),
                    "max_risk": float(np.max(area_risk_scores)),
                    "min_risk": float(np.min(area_risk_scores))
                },
                "elevation_stats": {
                    "mean_elevation": float(np.mean(area_elevations)),
                    "min_elevation": float(np.min(area_elevations)),
                    "max_elevation": float(np.max(area_elevations))
                }
            })

        # Sort by area size (largest first)
        high_risk_areas.sort(key=lambda x: x['pixel_count'], reverse=True)

        return high_risk_areas

    def get_tiered_risk_areas(self, max_areas_per_tier: int = 50) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get risk areas organized by tiers for better visualization.
        Uses caching and optimized processing for better performance.

        Args:
            max_areas_per_tier: Maximum number of areas to return per tier

        Returns:
            Dictionary with risk tiers as keys and lists of areas as values
        """
        # Check if we have cached risk grid and if parameters haven't changed
        cache_key = f"risk_grid_{self.params.rainfall_mm_per_hour}_{self.params.duration_hours}"
        
        if hasattr(self, '_cached_risk_grid') and hasattr(self, '_cache_key') and self._cache_key == cache_key:
            risk_grid = self._cached_risk_grid
        else:
            # Compute and cache the risk grid with current parameters
            rainfall_params = {
                "rainfall_mm_per_hour": self.params.rainfall_mm_per_hour,
                "duration_hours": self.params.duration_hours
            }
            risk_grid = self.compute_risk_grid(rainfall_params)
            self._cached_risk_grid = risk_grid
            self._cache_key = cache_key

        # Define risk tier thresholds
        tiers = {
            'very_high': {'min': 0.8, 'max': 1.0, 'areas': []},
            'high': {'min': 0.6, 'max': 0.8, 'areas': []},
            'moderate': {'min': 0.4, 'max': 0.6, 'areas': []},
            'low': {'min': 0.2, 'max': 0.4, 'areas': []}
        }

        # Process each tier with optimizations
        for tier_name, tier_info in tiers.items():
            tier_mask = (risk_grid >= tier_info['min']) & (risk_grid < tier_info['max'])
            if tier_name == 'very_high':  # Include 1.0 in very_high tier
                tier_mask = risk_grid >= tier_info['min']

            # Skip processing if no pixels in this tier
            if not np.any(tier_mask):
                tier_info['areas'] = []
                continue

            # Find connected components for this tier
            from scipy import ndimage
            labeled_areas, num_areas = ndimage.label(tier_mask)

            # Get component sizes first to prioritize larger areas
            component_sizes = []
            for area_id in range(1, num_areas + 1):
                area_mask = labeled_areas == area_id
                size = np.sum(area_mask)
                if size >= 5:  # Only consider areas with at least 5 pixels
                    component_sizes.append((area_id, size))

            # Sort by size (largest first) and process only top candidates
            component_sizes.sort(key=lambda x: x[1], reverse=True)

            tier_areas = []
            for area_id, size in component_sizes[:max_areas_per_tier * 2]:  # Process 2x to account for sorting by risk
                area_mask = labeled_areas == area_id
                area_indices = np.where(area_mask)

                # Get area statistics
                area_risk_scores = risk_grid[area_mask]
                area_elevations = self.grid.elevation[area_mask]

                # Get centroid
                centroid_row = int(np.mean(area_indices[0]))
                centroid_col = int(np.mean(area_indices[1]))
                centroid_lat, centroid_lon = self.grid.pixel_to_latlon(centroid_row, centroid_col)

                area_data = {
                    "area_id": f"{tier_name}_{area_id}",
                    "tier": tier_name,
                    "pixel_count": len(area_indices[0]),
                    "area_approx_m2": len(area_indices[0]) * (self.grid.georef['pixel_size_x'] ** 2),
                    "centroid": {"lat": centroid_lat, "lon": centroid_lon},
                    "risk_stats": {
                        "mean_risk": float(np.mean(area_risk_scores)),
                        "max_risk": float(np.max(area_risk_scores)),
                        "min_risk": float(np.min(area_risk_scores))
                    },
                    "elevation_stats": {
                        "mean_elevation": float(np.mean(area_elevations)),
                        "min_elevation": float(np.min(area_elevations)),
                        "max_elevation": float(np.max(area_elevations))
                    }
                }
                tier_areas.append(area_data)

            # Sort by mean risk (highest first) and limit count
            tier_areas.sort(key=lambda x: x['risk_stats']['mean_risk'], reverse=True)
            tier_info['areas'] = tier_areas[:max_areas_per_tier]

        # Return just the areas for each tier
        return {
            'very_high': tiers['very_high']['areas'],
            'high': tiers['high']['areas'],
            'moderate': tiers['moderate']['areas'],
            'low': tiers['low']['areas']
        }

    def get_risk_statistics(self) -> Dict[str, Any]:
        """
        Get overall risk statistics for the study area.

        Returns:
            Dictionary with risk statistics
        """
        risk_grid = self.compute_risk_grid()

        # Count pixels by risk level
        risk_counts = {
            "very_low": int(np.sum(risk_grid < 0.2)),
            "low": int(np.sum((risk_grid >= 0.2) & (risk_grid < 0.4))),
            "moderate": int(np.sum((risk_grid >= 0.4) & (risk_grid < 0.6))),
            "high": int(np.sum((risk_grid >= 0.6) & (risk_grid < 0.8))),
            "very_high": int(np.sum(risk_grid >= 0.8))
        }

        total_pixels = np.sum(list(risk_counts.values()))
        risk_percentages = {k: (v / total_pixels * 100) for k, v in risk_counts.items()}

        return {
            "total_area_pixels": total_pixels,
            "area_approx_km2": total_pixels * (self.grid.georef['pixel_size_x'] ** 2) / 1e6,
            "risk_distribution": {
                "counts": risk_counts,
                "percentages": risk_percentages
            },
            "overall_stats": {
                "mean_risk": float(np.mean(risk_grid)),
                "max_risk": float(np.max(risk_grid)),
                "std_risk": float(np.std(risk_grid))
            },
            "depression_areas": {
                "total_pixels": int(np.sum(self.depression_mask)),
                "percentage": float(np.sum(self.depression_mask) / total_pixels * 100)
            }
        }


def main():
    """Main function for testing risk assessment."""
    from grid import Grid

    # Load grid data
    grid = Grid()
    if grid.elevation is None:
        print("No grid data loaded. Run preprocessing first.")
        return 1

    # Initialize risk assessment
    risk_params = RiskParameters(
        rainfall_mm_per_hour=50.0,  # Heavy rainfall scenario
        duration_hours=2.0
    )
    risk_model = FloodRiskAssessment(grid, risk_params)

    # Get overall statistics
    stats = risk_model.get_risk_statistics()
    print("Risk Assessment Statistics:")
    print(f"Study area: {stats['area_approx_km2']:.2f} km²")
    print(f"Mean risk score: {stats['overall_stats']['mean_risk']:.3f}")
    print("\nRisk distribution:")
    for level, percentage in stats['risk_distribution']['percentages'].items():
        print(f"  {level.replace('_', ' ').title()}: {percentage:.1f}%")

    # Find high-risk areas
    high_risk_areas = risk_model.get_high_risk_areas(min_risk_score=0.7)
    print(f"\nHigh-risk areas found: {len(high_risk_areas)}")
    for i, area in enumerate(high_risk_areas[:5]):  # Show top 5
        print(f"  Area {i+1}: {area['area_approx_m2']:.0f} m², "
              f"risk {area['risk_stats']['mean_risk']:.3f}")

    # Test point assessment
    bounds = grid.get_bounds_latlon()
    if bounds:
        center_lat = (bounds['north'] + bounds['south']) / 2
        center_lon = (bounds['east'] + bounds['west']) / 2

        point_risk = risk_model.assess_point_risk(center_lat, center_lon)
        print(f"\nRisk assessment at center point:")
        print(f"  Risk level: {point_risk['risk_level']}")
        print(f"  Risk score: {point_risk['risk_score']}")
        print(f"  Potential depth: {point_risk['potential_depth_mm']} mm")

    return 0


if __name__ == "__main__":
    exit(main())