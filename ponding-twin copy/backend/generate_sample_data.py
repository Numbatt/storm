#!/usr/bin/env python3
"""
Generate sample data files for local development.
This creates mock data to test the application without full preprocessing.
"""

import numpy as np
import json
from pathlib import Path

def generate_sample_data():
    """Generate sample data files for testing."""
    
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    print("Generating sample data files...")
    
    # 1. Generate sample elevation data (Z.npy)
    print("Creating elevation data (Z.npy)...")
    # Create a 100x100 grid with elevation values
    # Simulate Houston area: mostly flat with some variation
    np.random.seed(42)  # For reproducible results
    elevation = np.random.normal(15, 2, (100, 100))  # Mean 15m, std 2m
    # Add some depressions (lower areas)
    elevation[20:30, 20:30] -= 5  # Depression area
    elevation[70:80, 70:80] -= 3  # Another depression
    
    np.save(data_dir / "Z.npy", elevation.astype(np.float32))
    print(f"  - Elevation range: {elevation.min():.2f}m to {elevation.max():.2f}m")
    
    # 2. Generate sample flow accumulation data (ACC.npy)
    print("Creating flow accumulation data (ACC.npy)...")
    # Create flow accumulation values (higher in low areas)
    flow_accum = np.random.exponential(100, (100, 100)).astype(np.int32)
    # Make depressions have higher accumulation
    flow_accum[20:30, 20:30] *= 10
    flow_accum[70:80, 70:80] *= 5
    
    np.save(data_dir / "ACC.npy", flow_accum)
    print(f"  - Flow accumulation range: {flow_accum.min()} to {flow_accum.max()}")
    
    # 3. Generate georeference data (georef.json)
    print("Creating georeference data (georef.json)...")
    # Houston area coordinates (approximate)
    georef = {
        "pixel_size_x": 5.0,  # 5m pixels
        "pixel_size_y": 5.0,
        "origin_x": -95.35,   # Houston longitude
        "origin_y": 29.78,    # Houston latitude
        "coordinate_system": "EPSG:4326",
        "grid_width": 100,
        "grid_height": 100,
        "area_approx_km2": 0.25  # 500m x 500m = 0.25 km²
    }
    
    with open(data_dir / "georef.json", "w") as f:
        json.dump(georef, f, indent=2)
    
    print(f"  - Grid size: {georef['grid_width']}x{georef['grid_height']}")
    print(f"  - Pixel size: {georef['pixel_size_x']}m x {georef['pixel_size_y']}m")
    print(f"  - Approximate area: {georef['area_approx_km2']} km²")
    
    # 4. Create a simple DEM TIFF file (dem_quarter.tif)
    print("Creating DEM TIFF file (dem_quarter.tif)...")
    try:
        import rasterio
        from rasterio.transform import from_bounds
        
        # Define the bounds for Houston area
        west, south, east, north = -95.355, 29.775, -95.350, 29.780
        
        transform = from_bounds(west, south, east, north, 100, 100)
        
        with rasterio.open(
            data_dir / "dem_quarter.tif",
            'w',
            driver='GTiff',
            height=100,
            width=100,
            count=1,
            dtype=elevation.dtype,
            crs='EPSG:4326',
            transform=transform,
        ) as dst:
            dst.write(elevation, 1)
        
        print("  - DEM TIFF created successfully")
        
    except ImportError:
        print("  - Warning: rasterio not available, skipping DEM TIFF creation")
        print("  - You may need to install rasterio: pip install rasterio")
    
    print("\n✅ Sample data generation complete!")
    print(f"Data files created in: {data_dir.absolute()}")
    print("\nFiles created:")
    print("  - Z.npy (elevation data)")
    print("  - ACC.npy (flow accumulation data)")
    print("  - georef.json (georeference information)")
    print("  - dem_quarter.tif (DEM raster file)")
    
    # Verify files
    print("\nVerifying files...")
    for filename in ["Z.npy", "ACC.npy", "georef.json"]:
        file_path = data_dir / filename
        if file_path.exists():
            size_mb = file_path.stat().st_size / (1024 * 1024)
            print(f"  ✅ {filename}: {size_mb:.2f} MB")
        else:
            print(f"  ❌ {filename}: Missing")

if __name__ == "__main__":
    generate_sample_data()
