#!/usr/bin/env python3
"""
Hydrology preprocessing module using WhiteboxTools.

Processes DEM data to compute flow accumulation and other hydrological features
needed for flood risk assessment.
"""

import os
import json
import numpy as np
import rasterio
import whitebox
from pathlib import Path
from typing import Tuple, Dict, Any


class HydrologyPreprocessor:
    """Handles hydrological preprocessing of DEM data using WhiteboxTools."""

    def __init__(self, data_dir: str = "data"):
        """
        Initialize the preprocessor.

        Args:
            data_dir: Directory containing input data files
        """
        self.data_dir = Path(data_dir)
        self.wbt = whitebox.WhiteboxTools()
        self.wbt.verbose = False  # Set to True for debugging
        self.wbt.work_dir = str(self.data_dir)

    def process_dem(self, input_dem: str = "dem_quarter.tif") -> Dict[str, Any]:
        """
        Complete hydrological preprocessing pipeline.

        Args:
            input_dem: Input DEM filename

        Returns:
            Dictionary with processing results and metadata
        """
        print(f"Starting hydrological preprocessing of {input_dem}")

        # Define file paths
        input_path = self.data_dir / input_dem
        dem_5m_path = self.data_dir / "dem_5m.tif"
        filled_path = self.data_dir / "dem_filled.tif"
        flow_accum_path = self.data_dir / "flow_accum.tif"
        z_npy_path = self.data_dir / "Z.npy"
        acc_npy_path = self.data_dir / "ACC.npy"
        georef_path = self.data_dir / "georef.json"

        # Verify input file exists
        if not input_path.exists():
            raise FileNotFoundError(f"Input DEM not found: {input_path}")

        # Step 1: Copy input DEM to standardized name
        print("Step 1: Preparing DEM data...")
        if input_dem != "dem_5m.tif":
            self._copy_file(str(input_path), str(dem_5m_path))

        # Step 2: Fill sinks to create hydrologically correct surface
        print("Step 2: Filling sinks in DEM...")
        self.wbt.fill_depressions_wang_and_liu(
            "dem_5m.tif",
            "dem_filled.tif"
        )

        # Step 3: Compute flow direction
        print("Step 3: Computing flow direction...")
        self.wbt.d8_pointer(
            "dem_filled.tif",
            "flow_dir.tif"
        )

        # Step 4: Compute flow accumulation
        print("Step 4: Computing flow accumulation...")
        self.wbt.d8_flow_accumulation(
            "dem_filled.tif",
            "flow_accum.tif"
        )

        # Step 5: Load raster data and convert to numpy arrays
        print("Step 5: Converting to numpy arrays...")
        elevation_array, georef_info = self._raster_to_numpy(str(filled_path))
        flow_accum_array, _ = self._raster_to_numpy(str(flow_accum_path))

        # Step 6: Save numpy arrays
        print("Step 6: Saving processed data...")
        np.save(str(z_npy_path), elevation_array)
        np.save(str(acc_npy_path), flow_accum_array)

        # Step 7: Save georeferencing information
        with open(str(georef_path), 'w') as f:
            json.dump(georef_info, f, indent=2)

        # Generate summary statistics
        results = {
            "input_file": input_dem,
            "grid_shape": elevation_array.shape,
            "elevation_stats": {
                "min": float(np.nanmin(elevation_array)),
                "max": float(np.nanmax(elevation_array)),
                "mean": float(np.nanmean(elevation_array)),
                "std": float(np.nanstd(elevation_array))
            },
            "flow_accum_stats": {
                "min": float(np.nanmin(flow_accum_array)),
                "max": float(np.nanmax(flow_accum_array)),
                "mean": float(np.nanmean(flow_accum_array)),
                "std": float(np.nanstd(flow_accum_array))
            },
            "georeferencing": georef_info,
            "output_files": [
                "dem_5m.tif",
                "dem_filled.tif",
                "flow_accum.tif",
                "Z.npy",
                "ACC.npy",
                "georef.json"
            ]
        }

        print(f"Preprocessing complete! Grid shape: {elevation_array.shape}")
        print(f"Elevation range: {results['elevation_stats']['min']:.2f} to {results['elevation_stats']['max']:.2f} m")
        print(f"Flow accumulation range: {results['flow_accum_stats']['min']:.0f} to {results['flow_accum_stats']['max']:.0f}")

        return results

    def _copy_file(self, src: str, dst: str) -> None:
        """Copy a file using whitebox tools."""
        # Read and write using rasterio for reliable copying
        with rasterio.open(src) as src_dataset:
            profile = src_dataset.profile
            data = src_dataset.read(1)

        with rasterio.open(dst, 'w', **profile) as dst_dataset:
            dst_dataset.write(data, 1)

    def _raster_to_numpy(self, raster_path: str) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Convert raster to numpy array and extract georeferencing info.

        Args:
            raster_path: Path to raster file

        Returns:
            Tuple of (numpy array, georeferencing dict)
        """
        with rasterio.open(raster_path) as dataset:
            # Read data
            data = dataset.read(1)

            # Handle nodata values
            if dataset.nodata is not None:
                data = np.where(data == dataset.nodata, np.nan, data)

            # Extract georeferencing information
            transform = dataset.transform
            georef_info = {
                "crs": dataset.crs.to_string() if dataset.crs else None,
                "transform": list(transform),
                "bounds": list(dataset.bounds),
                "width": dataset.width,
                "height": dataset.height,
                "nodata": dataset.nodata,
                "pixel_size_x": transform[0],
                "pixel_size_y": abs(transform[4])
            }

            return data, georef_info

    def get_drainage_network(self, min_accumulation: int = 1000) -> np.ndarray:
        """
        Extract drainage network based on flow accumulation threshold.

        Args:
            min_accumulation: Minimum flow accumulation to define streams

        Returns:
            Binary array where 1 indicates stream cells
        """
        acc_path = self.data_dir / "ACC.npy"
        if not acc_path.exists():
            raise FileNotFoundError("Flow accumulation data not found. Run process_dem() first.")

        flow_accum = np.load(str(acc_path))
        drainage_network = (flow_accum >= min_accumulation).astype(np.uint8)

        return drainage_network

    def clean_temp_files(self) -> None:
        """Remove temporary processing files."""
        temp_files = ["flow_dir.tif"]
        for temp_file in temp_files:
            temp_path = self.data_dir / temp_file
            if temp_path.exists():
                temp_path.unlink()
                print(f"Removed temporary file: {temp_file}")


def main():
    """Main function for command-line usage."""
    import argparse

    parser = argparse.ArgumentParser(description="Hydrological preprocessing using WhiteboxTools")
    parser.add_argument("--input", "-i", default="dem_quarter.tif",
                       help="Input DEM filename (default: dem_quarter.tif)")
    parser.add_argument("--data-dir", "-d", default="data",
                       help="Data directory (default: data)")
    parser.add_argument("--clean", action="store_true",
                       help="Clean temporary files after processing")

    args = parser.parse_args()

    # Initialize preprocessor
    preprocessor = HydrologyPreprocessor(args.data_dir)

    try:
        # Run preprocessing
        results = preprocessor.process_dem(args.input)

        # Print summary
        print("\n" + "="*50)
        print("PREPROCESSING SUMMARY")
        print("="*50)
        print(f"Input file: {results['input_file']}")
        print(f"Grid dimensions: {results['grid_shape'][1]} x {results['grid_shape'][0]}")
        print(f"Elevation range: {results['elevation_stats']['min']:.2f} - {results['elevation_stats']['max']:.2f} m")
        print(f"Flow accumulation max: {results['flow_accum_stats']['max']:.0f}")
        print(f"Coordinate system: {results['georeferencing']['crs']}")
        print(f"Pixel size: {results['georeferencing']['pixel_size_x']:.1f} m")
        print("\nOutput files generated:")
        for output_file in results['output_files']:
            print(f"  - {output_file}")

        # Clean temporary files if requested
        if args.clean:
            preprocessor.clean_temp_files()

    except Exception as e:
        print(f"Error during preprocessing: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())