#!/usr/bin/env python3
"""
Flood Risk AI - Streamlined Pipeline
Complete flood risk assessment using Mask2Former segmentation.

Usage:
    python api/main_clean.py --lat 40.7580 --lon -73.9855
    python api/main_clean.py --lat 40.7580 --lon -73.9855 --json
"""

import argparse
import sys
import os
import json
from datetime import datetime

# Add src directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from data_fetch.elevation import ElevationFetcher
from data_fetch.weather import WeatherFetcher
from vision.mask2former_detector import Mask2FormerDetector
from scoring.flood_score import FloodRiskScorer
from recommend.recommender import FloodMitigationRecommender


def analyze_flood_risk(lat: float, lon: float, rainfall: float = 25.0, 
                      drains: str = 'unknown', debug: bool = False) -> dict:
    """
    Complete flood risk analysis pipeline.
    
    Args:
        lat: Latitude coordinate
        lon: Longitude coordinate  
        rainfall: Rainfall amount in mm
        drains: Drainage condition ('ok', 'none', 'unknown')
        debug: Enable debug output
        
    Returns:
        Complete analysis results
    """
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    
    # Initialize core components
    elevation_fetcher = ElevationFetcher(config_path)
    weather_fetcher = WeatherFetcher(config_path)
    surface_detector = Mask2FormerDetector(config_path, debug=debug)
    risk_scorer = FloodRiskScorer(config_path)
    recommender = FloodMitigationRecommender()
    
    # Check for existing images
    data_dir = os.path.join(os.path.dirname(__file__), "data", "processed")
    image_paths = [
        os.path.join(data_dir, f"{lat}_{lon}_0.jpg"),
        os.path.join(data_dir, f"{lat}_{lon}_90.jpg"),
        os.path.join(data_dir, f"{lat}_{lon}_180.jpg"),
        os.path.join(data_dir, f"{lat}_{lon}_270.jpg")
    ]
    
    existing_images = [img for img in image_paths if os.path.exists(img)]
    
    if not existing_images:
        raise FileNotFoundError(
            f"No images found for coordinates {lat}, {lon}. "
            f"Expected files: {[os.path.basename(img) for img in image_paths]}"
        )
    
    if not debug:
        print(f"📸 Using Mask2Former with {len(existing_images)} local images...")
    
    # Step 1: Surface Analysis
    surfaces = surface_detector.analyze_local_images(existing_images)
    
    # Step 2: Get elevation and slope
    if not debug:
        print("⛰️  Loading stored elevation and slope...")
    elevation = elevation_fetcher._get_elevation(lat, lon) or 50.0
    slope_pct = elevation_fetcher.get_slope(lat, lon)
    
    # Step 3: Get rainfall forecast  
    if not debug:
        print("🌧️  Fetching rainfall forecast...")
    try:
        rainfall_mm = weather_fetcher.get_rainfall(lat, lon)
    except:
        rainfall_mm = rainfall
        if not debug:
            print(f"⚠️ Warning: Using mock data - OpenWeather API key not configured")
            print(f"🌧️ Mock rainfall forecast (24h): {rainfall_mm}mm")
    
    # Step 4: Calculate flood risk
    if not debug:
        print("🔍 Analyzing surface types with Mask2Former...")
        print("⚠️  Calculating flood risk score...")
    
    risk_data = risk_scorer.calculate_flood_risk(
        rainfall_mm=rainfall_mm,
        asphalt_pct=surfaces['asphalt'],
        slope_pct=slope_pct,
        drain_pct=0.0,  # Estimated - could be enhanced
        greenery_pct=surfaces['greenery'],
        peak_intensity=rainfall_mm / 2,  # Rough estimate
        drains=drains
    )
    
    # Step 5: Generate recommendations
    if not debug:
        print("💡 Generating recommendations...")
    recommendations = recommender.generate_recommendations(risk_data)
    
    # Compile results
    results = {
        'coords': {'lat': lat, 'lon': lon},
        'rainfall_mm': rainfall_mm,
        'slope_pct': slope_pct,
        'elevation_m': elevation,
        'surfaces': {
            'asphalt': surfaces['asphalt'],
            'greenery': surfaces['greenery'], 
            'other': surfaces['other']
        },
        'risk': {
            'score': risk_data['flood_risk_score'],
            'level': risk_data['risk_level']
        },
        'recommendation': recommendations,
        'streetImageUrl': existing_images[0] if existing_images else None,
        'timestamp': datetime.now().isoformat()
    }
    
    return results


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Flood Risk AI - Streamlined Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python api/main_clean.py --lat 40.7580 --lon -73.9855
  python api/main_clean.py --lat 25.7617 --lon -80.1918 --json
  python api/main_clean.py --lat 29.7158 --lon -95.4018 --debug
        """
    )
    
    parser.add_argument('--lat', type=float, required=True,
                       help='Latitude coordinate')
    parser.add_argument('--lon', type=float, required=True,
                       help='Longitude coordinate')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug output showing detected classes')
    parser.add_argument('--rainfall', type=float, default=25,
                       help='Rainfall amount in mm (default: 25)')
    parser.add_argument('--drains', type=str, choices=['ok', 'none', 'unknown'], 
                       default='unknown', help='Drainage condition (default: unknown)')
    
    args = parser.parse_args()
    
    # Validate coordinates
    if not (-90 <= args.lat <= 90):
        print("❌ Error: Latitude must be between -90 and 90")
        sys.exit(1)
    
    if not (-180 <= args.lon <= 180):
        print("❌ Error: Longitude must be between -180 and 180")
        sys.exit(1)
    
    try:
        # Run analysis
        results = analyze_flood_risk(
            lat=args.lat,
            lon=args.lon,
            rainfall=args.rainfall,
            drains=args.drains,
            debug=args.debug
        )
        
        if args.json:
            # Clean JSON output
            print(json.dumps(results, indent=2))
        else:
            # Human-readable output
            print("=" * 50)
            print("📊 ANALYSIS RESULTS")
            print("=" * 50)
            print()
            print(f"🌧️  RAINFALL FORECAST")
            print(f"   24-hour rainfall: {results['rainfall_mm']:.1f} mm (forecast)")
            print()
            print(f"📏 SLOPE ANALYSIS") 
            print(f"   Terrain slope: {results['slope_pct']:.2f}%")
            print()
            print(f"🚰 DRAINAGE CONDITION")
            print(f"   Drains: {args.drains}")
            print()
            print(f"🛣️  SURFACE COVERAGE")
            print(f"   🛣️ Asphalt: {results['surfaces']['asphalt']:.1f}%")
            print(f"   🌿 Greenery: {results['surfaces']['greenery']:.1f}%")
            print(f"   📦 Other: {results['surfaces']['other']:.1f}%")
            print(f"   📊 Model: Mask2Former (Mapillary Vistas)")
            print()
            print(f"⚠️  FLOOD RISK ASSESSMENT")
            print(f"   Risk Score: {results['risk']['score']:.1f}/100")
            print(f"   Risk Level: {results['risk']['level']}")
            print()
            print(f"💡 RECOMMENDATIONS")
            recs = results['recommendation']
            print(f"   📈 Expected Risk Reduction: {recs['expected_risk_reduction']['expected_reduction_percentage']:.0f}%")
            print(f"   💰 Total Cost: ${recs['cost_analysis']['total_estimated_cost']:,}")
            print(f"   🎯 Top Priority: {recs['primary_recommendations'][0]['title']}")
            print()
            print(f"📷 Street View Image: {results['streetImageUrl']}")
            print()
            print("✅ Analysis completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
