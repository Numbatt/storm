#!/usr/bin/env python3
"""
Tests for grid module functionality.
"""

import pytest
import numpy as np
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.append('..')
from grid import Grid


class TestGrid:
    """Test cases for Grid class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.data_dir = Path(self.temp_dir)

        # Create mock data files
        self.create_mock_data()

    def create_mock_data(self):
        """Create mock data files for testing."""
        # Create elevation data (10x10 grid)
        elevation = np.random.uniform(10, 20, (10, 10)).astype(np.float32)
        np.save(self.data_dir / "Z.npy", elevation)

        # Create flow accumulation data
        flow_accum = np.random.uniform(0, 1000, (10, 10)).astype(np.float32)
        np.save(self.data_dir / "ACC.npy", flow_accum)

        # Create georeferencing info
        georef = {
            "crs": "EPSG:26915",
            "transform": [5.0, 0.0, 272497.0, 0.0, -5.0, 3297503.0],
            "bounds": [272497.0, 3292498.0, 272547.0, 3297553.0],
            "width": 10,
            "height": 10,
            "nodata": -9999.0,
            "pixel_size_x": 5.0,
            "pixel_size_y": 5.0
        }

        with open(self.data_dir / "georef.json", 'w') as f:
            json.dump(georef, f)

    def test_grid_initialization(self):
        """Test grid initialization with data."""
        grid = Grid(str(self.data_dir))

        assert grid.elevation is not None
        assert grid.flow_accum is not None
        assert grid.georef is not None
        assert grid.elevation.shape == (10, 10)
        assert grid.flow_accum.shape == (10, 10)

    def test_grid_initialization_missing_data(self):
        """Test grid initialization with missing data."""
        empty_dir = tempfile.mkdtemp()
        grid = Grid(empty_dir)

        assert grid.elevation is None
        assert grid.flow_accum is None
        assert grid.georef is None

    def test_pixel_to_coord(self):
        """Test pixel to coordinate conversion."""
        grid = Grid(str(self.data_dir))

        x, y = grid.pixel_to_coord(0, 0)
        assert isinstance(x, float)
        assert isinstance(y, float)

        # Test specific coordinate conversion
        x, y = grid.pixel_to_coord(5, 5)
        expected_x = 272497.0 + 5 * 5.0 + 2.5  # center of pixel
        expected_y = 3297503.0 - 5 * 5.0 - 2.5  # center of pixel
        assert abs(x - expected_x) < 0.1
        assert abs(y - expected_y) < 0.1

    def test_coord_to_pixel(self):
        """Test coordinate to pixel conversion."""
        grid = Grid(str(self.data_dir))

        # Test round-trip conversion
        original_row, original_col = 3, 7
        x, y = grid.pixel_to_coord(original_row, original_col)
        row, col = grid.coord_to_pixel(x, y)

        assert abs(row - original_row) < 1
        assert abs(col - original_col) < 1

    @patch('grid.Transformer')
    def test_latlon_conversion(self, mock_transformer):
        """Test lat/lon coordinate conversion."""
        # Mock the transformer
        mock_transformer_instance = MagicMock()
        mock_transformer_instance.transform.return_value = (272522.0, 3297528.0)
        mock_transformer.from_crs.return_value = mock_transformer_instance

        grid = Grid(str(self.data_dir))

        # Test lat/lon to pixel conversion
        row, col = grid.latlon_to_pixel(29.76, -95.32)
        assert isinstance(row, int)
        assert isinstance(col, int)

    def test_bilinear_interpolation(self):
        """Test bilinear interpolation."""
        grid = Grid(str(self.data_dir))

        # Test interpolation at exact grid point
        exact_value = grid._bilinear_interpolate(grid.elevation, 5.0, 5.0)
        assert exact_value == grid.elevation[5, 5]

        # Test interpolation between points
        interp_value = grid._bilinear_interpolate(grid.elevation, 5.5, 5.5)
        assert interp_value is not None
        assert isinstance(interp_value, float)

        # Test out of bounds
        out_of_bounds = grid._bilinear_interpolate(grid.elevation, -1.0, -1.0)
        assert out_of_bounds is None

        out_of_bounds = grid._bilinear_interpolate(grid.elevation, 15.0, 15.0)
        assert out_of_bounds is None

    def test_elevation_query(self):
        """Test elevation query with mocked coordinate conversion."""
        with patch.object(Grid, 'latlon_to_pixel') as mock_latlon_to_pixel:
            mock_latlon_to_pixel.return_value = (5, 5)

            grid = Grid(str(self.data_dir))
            elevation = grid.get_elevation(29.76, -95.32)

            assert elevation is not None
            assert isinstance(elevation, float)
            mock_latlon_to_pixel.assert_called_once_with(29.76, -95.32)

    def test_flow_accumulation_query(self):
        """Test flow accumulation query."""
        with patch.object(Grid, 'latlon_to_pixel') as mock_latlon_to_pixel:
            mock_latlon_to_pixel.return_value = (5, 5)

            grid = Grid(str(self.data_dir))
            flow_accum = grid.get_flow_accumulation(29.76, -95.32)

            assert flow_accum is not None
            assert isinstance(flow_accum, float)

    def test_bounds_calculation(self):
        """Test bounds calculation."""
        with patch.object(Grid, 'transformer_to_wgs84') as mock_transformer:
            mock_transformer_instance = MagicMock()
            mock_transformer_instance.transform.side_effect = [
                (-95.35, 29.75),  # SW corner
                (-95.35, 29.77),  # NW corner
                (-95.33, 29.75),  # SE corner
                (-95.33, 29.77)   # NE corner
            ]

            grid = Grid(str(self.data_dir))
            grid.transformer_to_wgs84 = mock_transformer_instance

            bounds = grid.get_bounds_latlon()

            assert bounds is not None
            assert 'north' in bounds
            assert 'south' in bounds
            assert 'east' in bounds
            assert 'west' in bounds
            assert bounds['north'] > bounds['south']
            assert bounds['east'] > bounds['west']

    def test_within_bounds_check(self):
        """Test bounds checking."""
        with patch.object(Grid, 'get_bounds_latlon') as mock_bounds:
            mock_bounds.return_value = {
                'north': 29.77,
                'south': 29.75,
                'east': -95.33,
                'west': -95.35
            }

            grid = Grid(str(self.data_dir))

            # Point within bounds
            assert grid.is_within_bounds(29.76, -95.34) == True

            # Point outside bounds
            assert grid.is_within_bounds(29.80, -95.34) == False
            assert grid.is_within_bounds(29.76, -95.30) == False

    def test_metadata_generation(self):
        """Test metadata generation."""
        grid = Grid(str(self.data_dir))
        metadata = grid.get_metadata()

        assert isinstance(metadata, dict)
        assert 'grid_shape' in metadata
        assert 'pixel_size' in metadata
        assert 'coordinate_system' in metadata
        assert 'bounds' in metadata

        # Check grid shape
        assert metadata['grid_shape']['rows'] == 10
        assert metadata['grid_shape']['cols'] == 10

        # Check pixel size
        assert metadata['pixel_size']['x'] == 5.0
        assert metadata['pixel_size']['y'] == 5.0

    def test_drainage_network_mask(self):
        """Test drainage network mask generation."""
        grid = Grid(str(self.data_dir))
        mask = grid.get_drainage_network_mask(min_accumulation=100)

        assert mask is not None
        assert mask.shape == grid.flow_accum.shape
        assert mask.dtype == np.uint8
        assert np.all((mask == 0) | (mask == 1))

    def test_error_handling_nan_values(self):
        """Test handling of NaN values in data."""
        # Create data with NaN values
        elevation_with_nan = np.random.uniform(10, 20, (10, 10)).astype(np.float32)
        elevation_with_nan[5, 5] = np.nan
        np.save(self.data_dir / "Z.npy", elevation_with_nan)

        grid = Grid(str(self.data_dir))

        # Test interpolation with NaN
        result = grid._bilinear_interpolate(grid.elevation, 5.0, 5.0)
        assert result is None

        result = grid._bilinear_interpolate(grid.elevation, 4.0, 4.0)
        assert result is not None

    def teardown_method(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])