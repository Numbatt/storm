#!/usr/bin/env python3
"""
Grid management module for handling spatial data and coordinate transformations.

Manages loading of processed elevation and flow accumulation data,
coordinate transformations, and spatial queries.
"""

import json
import numpy as np
import rasterio
from pathlib import Path
from typing import Tuple, Optional, Dict, Any, List
from pyproj import Transformer
import rasterio.transform


class Grid:
    """Manages spatial grid data and coordinate transformations."""

    def __init__(self, data_dir: str = "data"):
        """
        Initialize the grid manager.

        Args:
            data_dir: Directory containing processed data files
        """
        self.data_dir = Path(data_dir)
        self.elevation: Optional[np.ndarray] = None
        self.flow_accum: Optional[np.ndarray] = None
        self.georef: Optional[Dict[str, Any]] = None
        self.transformer_to_wgs84: Optional[Transformer] = None
        self.transformer_from_wgs84: Optional[Transformer] = None

        # Load data if available
        self.load_data()

    def load_data(self) -> bool:
        """
        Load processed elevation and flow accumulation data.

        Returns:
            True if data loaded successfully, False otherwise
        """
        try:
            # Load numpy arrays
            z_path = self.data_dir / "Z.npy"
            acc_path = self.data_dir / "ACC.npy"
            georef_path = self.data_dir / "georef.json"

            if not all(p.exists() for p in [z_path, acc_path, georef_path]):
                print("Processed data files not found. Run preprocessing first.")
                return False

            self.elevation = np.load(str(z_path))
            self.flow_accum = np.load(str(acc_path))

            # Load georeferencing information
            with open(str(georef_path), 'r') as f:
                self.georef = json.load(f)

            # Set up coordinate transformers
            if self.georef['crs']:
                self.transformer_to_wgs84 = Transformer.from_crs(
                    self.georef['crs'], "EPSG:4326", always_xy=True
                )
                self.transformer_from_wgs84 = Transformer.from_crs(
                    "EPSG:4326", self.georef['crs'], always_xy=True
                )

            print(f"Loaded grid data: {self.elevation.shape} cells")
            print(f"Coordinate system: {self.georef['crs']}")
            return True

        except Exception as e:
            print(f"Error loading grid data: {e}")
            return False

    def pixel_to_coord(self, row: int, col: int) -> Tuple[float, float]:
        """
        Convert pixel coordinates to map coordinates.

        Args:
            row: Pixel row (y-direction)
            col: Pixel column (x-direction)

        Returns:
            Tuple of (x, y) coordinates in the grid's CRS
        """
        if not self.georef:
            raise ValueError("No georeferencing information available")

        transform = rasterio.transform.Affine(*self.georef['transform'])
        x, y = rasterio.transform.xy(transform, row, col)
        return x, y

    def coord_to_pixel(self, x: float, y: float) -> Tuple[int, int]:
        """
        Convert map coordinates to pixel coordinates.

        Args:
            x: X coordinate in the grid's CRS
            y: Y coordinate in the grid's CRS

        Returns:
            Tuple of (row, col) pixel coordinates
        """
        if not self.georef:
            raise ValueError("No georeferencing information available")

        transform = rasterio.transform.Affine(*self.georef['transform'])
        row, col = rasterio.transform.rowcol(transform, x, y)
        return int(row), int(col)

    def latlon_to_pixel(self, lat: float, lon: float) -> Tuple[int, int]:
        """
        Convert latitude/longitude to pixel coordinates.

        Args:
            lat: Latitude in decimal degrees
            lon: Longitude in decimal degrees

        Returns:
            Tuple of (row, col) pixel coordinates
        """
        if not self.transformer_from_wgs84:
            raise ValueError("No coordinate transformer available")

        # Transform to grid CRS
        x, y = self.transformer_from_wgs84.transform(lon, lat)
        return self.coord_to_pixel(x, y)

    def pixel_to_latlon(self, row: int, col: int) -> Tuple[float, float]:
        """
        Convert pixel coordinates to latitude/longitude.

        Args:
            row: Pixel row
            col: Pixel column

        Returns:
            Tuple of (lat, lon) in decimal degrees
        """
        if not self.transformer_to_wgs84:
            raise ValueError("No coordinate transformer available")

        # Get map coordinates
        x, y = self.pixel_to_coord(row, col)

        # Transform to WGS84
        lon, lat = self.transformer_to_wgs84.transform(x, y)
        return lat, lon

    def get_elevation(self, lat: float, lon: float) -> Optional[float]:
        """
        Get elevation at a specific latitude/longitude using bilinear interpolation.

        Args:
            lat: Latitude in decimal degrees
            lon: Longitude in decimal degrees

        Returns:
            Elevation in meters, or None if outside grid bounds
        """
        if self.elevation is None:
            return None

        try:
            row, col = self.latlon_to_pixel(lat, lon)
            return self._bilinear_interpolate(self.elevation, row, col)
        except (ValueError, IndexError):
            return None

    def get_flow_accumulation(self, lat: float, lon: float) -> Optional[float]:
        """
        Get flow accumulation at a specific latitude/longitude.

        Args:
            lat: Latitude in decimal degrees
            lon: Longitude in decimal degrees

        Returns:
            Flow accumulation value, or None if outside grid bounds
        """
        if self.flow_accum is None:
            return None

        try:
            row, col = self.latlon_to_pixel(lat, lon)
            return self._bilinear_interpolate(self.flow_accum, row, col)
        except (ValueError, IndexError):
            return None

    def _bilinear_interpolate(self, array: np.ndarray, row: float, col: float) -> Optional[float]:
        """
        Perform bilinear interpolation on array at given coordinates.

        Args:
            array: 2D numpy array
            row: Row coordinate (can be fractional)
            col: Column coordinate (can be fractional)

        Returns:
            Interpolated value, or None if outside bounds or NaN
        """
        height, width = array.shape

        # Check bounds
        if row < 0 or row >= height - 1 or col < 0 or col >= width - 1:
            return None

        # Get integer and fractional parts
        r0, c0 = int(row), int(col)
        r1, c1 = r0 + 1, c0 + 1
        dr, dc = row - r0, col - c0

        # Get the four corner values
        try:
            v00 = array[r0, c0]
            v01 = array[r0, c1]
            v10 = array[r1, c0]
            v11 = array[r1, c1]

            # Check for NaN values
            if np.isnan([v00, v01, v10, v11]).any():
                return None

            # Bilinear interpolation
            v0 = v00 * (1 - dc) + v01 * dc
            v1 = v10 * (1 - dc) + v11 * dc
            value = v0 * (1 - dr) + v1 * dr

            return float(value)

        except IndexError:
            return None

    def get_bounds_latlon(self) -> Optional[Dict[str, float]]:
        """
        Get grid bounds in latitude/longitude.

        Returns:
            Dictionary with 'north', 'south', 'east', 'west' keys
        """
        if not self.georef or not self.transformer_to_wgs84:
            return None

        bounds = self.georef['bounds']

        # Transform corners to lat/lon
        corners = [
            (bounds[0], bounds[1]),  # southwest
            (bounds[0], bounds[3]),  # northwest
            (bounds[2], bounds[1]),  # southeast
            (bounds[2], bounds[3])   # northeast
        ]

        lons, lats = [], []
        for x, y in corners:
            lon, lat = self.transformer_to_wgs84.transform(x, y)
            lons.append(lon)
            lats.append(lat)

        return {
            'north': max(lats),
            'south': min(lats),
            'east': max(lons),
            'west': min(lons)
        }

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get comprehensive grid metadata.

        Returns:
            Dictionary with grid information
        """
        if not self.georef:
            return {"error": "No grid data loaded"}

        metadata = {
            "grid_shape": {
                "rows": self.georef['height'],
                "cols": self.georef['width']
            },
            "pixel_size": {
                "x": self.georef['pixel_size_x'],
                "y": self.georef['pixel_size_y']
            },
            "coordinate_system": self.georef['crs'],
            "bounds": self.georef['bounds'],
            "bounds_latlon": self.get_bounds_latlon()
        }

        if self.elevation is not None:
            metadata["elevation_stats"] = {
                "min": float(np.nanmin(self.elevation)),
                "max": float(np.nanmax(self.elevation)),
                "mean": float(np.nanmean(self.elevation)),
                "std": float(np.nanstd(self.elevation))
            }

        if self.flow_accum is not None:
            metadata["flow_accum_stats"] = {
                "min": float(np.nanmin(self.flow_accum)),
                "max": float(np.nanmax(self.flow_accum)),
                "mean": float(np.nanmean(self.flow_accum)),
                "std": float(np.nanstd(self.flow_accum))
            }

        return metadata

    def is_within_bounds(self, lat: float, lon: float) -> bool:
        """
        Check if a lat/lon point is within the grid bounds.

        Args:
            lat: Latitude in decimal degrees
            lon: Longitude in decimal degrees

        Returns:
            True if within bounds, False otherwise
        """
        bounds = self.get_bounds_latlon()
        if not bounds:
            return False

        return (bounds['south'] <= lat <= bounds['north'] and
                bounds['west'] <= lon <= bounds['east'])

    def get_drainage_network_mask(self, min_accumulation: int = 1000) -> Optional[np.ndarray]:
        """
        Get binary mask of drainage network based on flow accumulation.

        Args:
            min_accumulation: Minimum flow accumulation threshold

        Returns:
            Binary array where 1 indicates drainage network
        """
        if self.flow_accum is None:
            return None

        return (self.flow_accum >= min_accumulation).astype(np.uint8)


def main():
    """Main function for testing grid functionality."""
    grid = Grid()

    if grid.elevation is None:
        print("No grid data loaded. Run preprocessing first.")
        return 1

    # Print metadata
    metadata = grid.get_metadata()
    print("Grid Metadata:")
    print(json.dumps(metadata, indent=2))

    # Test coordinate conversion
    bounds = grid.get_bounds_latlon()
    if bounds:
        center_lat = (bounds['north'] + bounds['south']) / 2
        center_lon = (bounds['east'] + bounds['west']) / 2

        print(f"\nTesting point queries at center: {center_lat:.6f}, {center_lon:.6f}")
        elevation = grid.get_elevation(center_lat, center_lon)
        flow_accum = grid.get_flow_accumulation(center_lat, center_lon)

        print(f"Elevation: {elevation:.2f} m" if elevation else "Elevation: N/A")
        print(f"Flow accumulation: {flow_accum:.0f}" if flow_accum else "Flow accumulation: N/A")

    return 0


if __name__ == "__main__":
    exit(main())