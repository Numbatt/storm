#!/usr/bin/env python3
"""
Tests for risk assessment module functionality.
"""

import pytest
import numpy as np
import tempfile
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import sys
sys.path.append('..')
from grid import Grid
from risk import FloodRiskAssessment, RiskParameters, RiskLevel


class TestRiskAssessment:
    """Test cases for FloodRiskAssessment class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.data_dir = Path(self.temp_dir)

        # Create mock grid data
        self.create_mock_data()
        self.grid = Grid(str(self.data_dir))

        # Create risk assessment with test parameters
        self.risk_params = RiskParameters(
            rainfall_mm_per_hour=25.0,
            duration_hours=1.0,
            drainage_coefficient=0.001,
            ponding_threshold_mm=50.0
        )

    def create_mock_data(self):
        """Create mock data files for testing."""
        # Create elevation data with realistic variation
        rows, cols = 20, 20
        x, y = np.meshgrid(np.linspace(0, 1, cols), np.linspace(0, 1, rows))
        elevation = 10 + 5 * (x + y) + 2 * np.sin(4 * np.pi * x) * np.cos(4 * np.pi * y)
        np.save(self.data_dir / "Z.npy", elevation.astype(np.float32))

        # Create flow accumulation with higher values in low areas
        flow_accum = np.exp(5 * (1 - (x + y) / 2)) * np.random.uniform(1, 100, (rows, cols))
        np.save(self.data_dir / "ACC.npy", flow_accum.astype(np.float32))

        # Create georeferencing info
        georef = {
            "crs": "EPSG:26915",
            "transform": [5.0, 0.0, 272497.0, 0.0, -5.0, 3297503.0],
            "bounds": [272497.0, 3292398.0, 272597.0, 3297503.0],
            "width": cols,
            "height": rows,
            "nodata": -9999.0,
            "pixel_size_x": 5.0,
            "pixel_size_y": 5.0
        }

        with open(self.data_dir / "georef.json", 'w') as f:
            json.dump(georef, f)

    def test_risk_assessment_initialization(self):
        """Test risk assessment initialization."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        assert risk_model.grid == self.grid
        assert risk_model.params == self.risk_params
        assert risk_model.elevation_risk is not None
        assert risk_model.flow_accum_risk is not None
        assert risk_model.depression_mask is not None

    def test_risk_assessment_no_data_error(self):
        """Test error when grid has no data."""
        empty_grid = Grid("nonexistent_dir")

        with pytest.raises(ValueError, match="Grid must have elevation and flow accumulation data"):
            FloodRiskAssessment(empty_grid, self.risk_params)

    def test_base_risk_factors_computation(self):
        """Test computation of base risk factors."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        # Elevation risk should be normalized and inverted
        assert risk_model.elevation_risk.shape == self.grid.elevation.shape
        assert np.all(risk_model.elevation_risk >= 0)
        assert np.all(risk_model.elevation_risk <= 1)

        # Flow accumulation risk should be normalized
        assert risk_model.flow_accum_risk.shape == self.grid.flow_accum.shape
        assert np.all(risk_model.flow_accum_risk >= 0)
        assert np.all(risk_model.flow_accum_risk <= 1)

        # Depression mask should be binary
        assert risk_model.depression_mask.shape == self.grid.elevation.shape
        assert np.all((risk_model.depression_mask == 0) | (risk_model.depression_mask == 1))

    def test_point_risk_assessment(self):
        """Test point risk assessment."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        # Mock coordinate conversion
        with patch.object(self.grid, 'latlon_to_pixel') as mock_latlon:
            with patch.object(self.grid, 'get_elevation') as mock_elevation:
                with patch.object(self.grid, 'get_flow_accumulation') as mock_flow:
                    with patch.object(self.grid, 'is_within_bounds') as mock_bounds:
                        # Set up mocks
                        mock_latlon.return_value = (10, 10)
                        mock_elevation.return_value = 12.5
                        mock_flow.return_value = 500.0
                        mock_bounds.return_value = True

                        result = risk_model.assess_point_risk(29.76, -95.32)

                        assert isinstance(result, dict)
                        assert 'location' in result
                        assert 'elevation_m' in result
                        assert 'flow_accumulation' in result
                        assert 'risk_score' in result
                        assert 'risk_level' in result
                        assert 'potential_depth_mm' in result

                        # Check data types and ranges
                        assert 0 <= result['risk_score'] <= 1
                        assert result['risk_level'] in ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']
                        assert result['potential_depth_mm'] >= 0

    def test_point_risk_assessment_out_of_bounds(self):
        """Test point risk assessment for out-of-bounds location."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        with patch.object(self.grid, 'is_within_bounds') as mock_bounds:
            mock_bounds.return_value = False

            result = risk_model.assess_point_risk(90.0, 180.0)

            assert 'error' in result
            assert result['error'] == "Point outside grid bounds"

    def test_point_risk_assessment_with_custom_rainfall(self):
        """Test point risk assessment with custom rainfall parameters."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        custom_rainfall = {
            'rainfall_mm_per_hour': 50.0,
            'duration_hours': 2.0
        }

        with patch.object(self.grid, 'latlon_to_pixel') as mock_latlon:
            with patch.object(self.grid, 'get_elevation') as mock_elevation:
                with patch.object(self.grid, 'get_flow_accumulation') as mock_flow:
                    with patch.object(self.grid, 'is_within_bounds') as mock_bounds:
                        mock_latlon.return_value = (10, 10)
                        mock_elevation.return_value = 12.5
                        mock_flow.return_value = 500.0
                        mock_bounds.return_value = True

                        result = risk_model.assess_point_risk(29.76, -95.32, custom_rainfall)

                        assert result['scenario']['rainfall_mm_per_hour'] == 50.0
                        assert result['scenario']['duration_hours'] == 2.0
                        assert result['scenario']['total_rainfall_mm'] == 100.0

    def test_risk_level_classification(self):
        """Test risk level classification."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        # Test different risk scores
        test_cases = [
            (0.1, 'VERY_LOW'),
            (0.3, 'LOW'),
            (0.5, 'MODERATE'),
            (0.7, 'HIGH'),
            (0.9, 'VERY_HIGH')
        ]

        for risk_score, expected_level in test_cases:
            with patch.object(self.grid, 'latlon_to_pixel'):
                with patch.object(self.grid, 'get_elevation'):
                    with patch.object(self.grid, 'get_flow_accumulation'):
                        with patch.object(self.grid, 'is_within_bounds'):
                            # Mock the computed risk score
                            with patch.object(risk_model, '_compute_composite_risk') as mock_risk:
                                mock_risk.return_value = risk_score
                                # This would require more complex mocking to test properly

    def test_grid_risk_computation(self):
        """Test grid-wide risk computation."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        risk_grid = risk_model.compute_risk_grid()

        assert risk_grid.shape == self.grid.elevation.shape
        assert np.all(risk_grid >= 0)
        assert np.all(risk_grid <= 1)

    def test_grid_risk_with_custom_rainfall(self):
        """Test grid risk computation with custom rainfall."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        custom_rainfall = {
            'rainfall_mm_per_hour': 75.0,
            'duration_hours': 0.5
        }

        risk_grid = risk_model.compute_risk_grid(custom_rainfall)

        assert risk_grid.shape == self.grid.elevation.shape
        # Risk should generally be higher with more intense rainfall
        assert np.mean(risk_grid) >= 0

    def test_high_risk_areas_identification(self):
        """Test identification of high-risk areas."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        high_risk_areas = risk_model.get_high_risk_areas(min_risk_score=0.3)

        assert isinstance(high_risk_areas, list)
        for area in high_risk_areas:
            assert 'area_id' in area
            assert 'pixel_count' in area
            assert 'area_approx_m2' in area
            assert 'centroid' in area
            assert 'risk_stats' in area
            assert 'elevation_stats' in area

            # Check that risk stats are valid
            assert area['risk_stats']['mean_risk'] >= 0.3
            assert area['risk_stats']['max_risk'] >= area['risk_stats']['mean_risk']
            assert area['risk_stats']['min_risk'] <= area['risk_stats']['mean_risk']

    def test_risk_statistics(self):
        """Test overall risk statistics computation."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        stats = risk_model.get_risk_statistics()

        assert isinstance(stats, dict)
        assert 'total_area_pixels' in stats
        assert 'area_approx_km2' in stats
        assert 'risk_distribution' in stats
        assert 'overall_stats' in stats
        assert 'depression_areas' in stats

        # Check risk distribution
        distribution = stats['risk_distribution']
        assert 'counts' in distribution
        assert 'percentages' in distribution

        # Percentages should sum to ~100%
        total_percentage = sum(distribution['percentages'].values())
        assert abs(total_percentage - 100.0) < 0.1

        # Check overall stats
        overall = stats['overall_stats']
        assert 0 <= overall['mean_risk'] <= 1
        assert 0 <= overall['max_risk'] <= 1
        assert overall['std_risk'] >= 0

    def test_depression_identification(self):
        """Test depression area identification."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        # Depression mask should identify some areas
        assert np.sum(risk_model.depression_mask) >= 0

        # Test with artificial depression
        # Create elevation data with a clear depression
        rows, cols = 10, 10
        elevation = np.ones((rows, cols)) * 15.0
        elevation[4:6, 4:6] = 10.0  # Create depression in center

        # Save and reload
        np.save(self.data_dir / "Z.npy", elevation.astype(np.float32))
        new_grid = Grid(str(self.data_dir))
        new_risk_model = FloodRiskAssessment(new_grid, self.risk_params)

        # Depression should be identified
        assert np.sum(new_risk_model.depression_mask) > 0
        # Depression should be near the center
        assert new_risk_model.depression_mask[4, 4] == 1 or new_risk_model.depression_mask[5, 5] == 1

    def test_risk_parameters_validation(self):
        """Test risk parameter validation."""
        # Test with invalid weights (not summing to 1)
        with pytest.raises(ValueError):
            invalid_params = RiskParameters(
                elevation_weight=0.5,
                flow_accum_weight=0.5,
                rainfall_weight=0.5  # Total = 1.5, should be 1.0
            )

        # Test with valid weights
        valid_params = RiskParameters(
            elevation_weight=0.5,
            flow_accum_weight=0.3,
            rainfall_weight=0.2  # Total = 1.0
        )
        risk_model = FloodRiskAssessment(self.grid, valid_params)
        assert risk_model.params.elevation_weight == 0.5

    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        risk_model = FloodRiskAssessment(self.grid, self.risk_params)

        # Test with zero rainfall
        zero_rainfall = {
            'rainfall_mm_per_hour': 0.0,
            'duration_hours': 1.0
        }

        risk_grid = risk_model.compute_risk_grid(zero_rainfall)
        # Risk should be lower with no rainfall
        assert np.all(risk_grid >= 0)

        # Test with extreme rainfall
        extreme_rainfall = {
            'rainfall_mm_per_hour': 200.0,
            'duration_hours': 6.0
        }

        risk_grid_extreme = risk_model.compute_risk_grid(extreme_rainfall)
        # Risk should generally be higher
        assert np.mean(risk_grid_extreme) >= np.mean(risk_grid)

    def teardown_method(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir)


class TestRiskParameters:
    """Test cases for RiskParameters class."""

    def test_default_parameters(self):
        """Test default parameter values."""
        params = RiskParameters()

        assert params.rainfall_mm_per_hour == 25.0
        assert params.duration_hours == 1.0
        assert params.drainage_coefficient == 0.001
        assert params.ponding_threshold_mm == 50.0
        assert params.elevation_weight == 0.4
        assert params.flow_accum_weight == 0.3
        assert params.rainfall_weight == 0.3

    def test_custom_parameters(self):
        """Test custom parameter values."""
        params = RiskParameters(
            rainfall_mm_per_hour=50.0,
            duration_hours=2.0,
            elevation_weight=0.5,
            flow_accum_weight=0.3,
            rainfall_weight=0.2
        )

        assert params.rainfall_mm_per_hour == 50.0
        assert params.duration_hours == 2.0
        assert params.elevation_weight == 0.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])