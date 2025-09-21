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
from dotenv import load_dotenv
from contextlib import redirect_stdout
from io import StringIO

# Load environment variables
load_dotenv()

# Add src directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from data_fetch.elevation import ElevationFetcher
from data_fetch.weather import WeatherFetcher
from data_fetch.streetview import StreetViewFetcher
from vision.mask2former_detector import Mask2FormerDetector
from scoring.flood_score import FloodRiskScorer
from recommend.recommender import FloodMitigationRecommender
try:
    from ai_insights.ai_insights_generator import AIInsightsGenerator
except ImportError as e:
    print(f"Warning: AI insights module not available: {e}")
    AIInsightsGenerator = None


def analyze_flood_risk(lat: float, lon: float, rainfall: float = 25.0, 
                      drains: str = 'unknown', road_type: str = 'residential street', 
                      debug: bool = False, json_mode: bool = False) -> dict:
    """
    Complete flood risk analysis pipeline.
    
    Args:
        lat: Latitude coordinate
        lon: Longitude coordinate  
        rainfall: Rainfall amount in mm
        drains: Drainage condition ('ok', 'none', 'unknown')
        road_type: Type of road/location context (e.g., 'residential street', 'highway lane', 'interstate section', 'sidewalk', 'parking lot')
        debug: Enable debug output
        
    Returns:
        Complete analysis results
    """
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    
    # Initialize core components
    if json_mode:
        # Suppress all output when in JSON mode
        with redirect_stdout(StringIO()):
            elevation_fetcher = ElevationFetcher(config_path)
            weather_fetcher = WeatherFetcher(config_path)
            surface_detector = Mask2FormerDetector(config_path, debug=debug)
            risk_scorer = FloodRiskScorer(config_path)
            recommender = FloodMitigationRecommender()
            ai_insights_generator = AIInsightsGenerator() if AIInsightsGenerator else None
    else:
        elevation_fetcher = ElevationFetcher(config_path)
        weather_fetcher = WeatherFetcher(config_path)
        surface_detector = Mask2FormerDetector(config_path, debug=debug)
        risk_scorer = FloodRiskScorer(config_path)
        recommender = FloodMitigationRecommender()
        ai_insights_generator = AIInsightsGenerator() if AIInsightsGenerator else None
    
    # Always fetch fresh images using Street View API - no cache dependency
    data_dir = os.path.join(os.path.dirname(__file__), "data", "processed")
    
    if not debug and not json_mode:
        print(f"📸 Fetching fresh images from Google Street View for {lat}, {lon}...")
    
    try:
        if json_mode:
            with redirect_stdout(StringIO()):
                streetview_fetcher = StreetViewFetcher(config_path)
                existing_images = streetview_fetcher.fetch_images(lat, lon, data_dir)
        else:
            streetview_fetcher = StreetViewFetcher(config_path)
            existing_images = streetview_fetcher.fetch_images(lat, lon, data_dir)
        
    except Exception as e:
        raise FileNotFoundError(
            f"Failed to fetch fresh Street View images for coordinates {lat}, {lon}: {e}"
        )
    
    if not debug and not json_mode:
        print(f"📸 Using Mask2Former with {len(existing_images)} local images...")
    
    # Step 1: Surface Analysis
    if json_mode:
        # Suppress output when in JSON mode
        with redirect_stdout(StringIO()):
            surfaces = surface_detector.analyze_local_images(existing_images)
    else:
        surfaces = surface_detector.analyze_local_images(existing_images)
    
    # Save segmented images for frontend display
    results_dir = os.path.join(os.path.dirname(__file__), "data", "results")
    if json_mode:
        with redirect_stdout(StringIO()):
            segmentation_images = surface_detector.save_segmented_images(existing_images, results_dir, lat, lon)
    else:
        segmentation_images = surface_detector.save_segmented_images(existing_images, results_dir, lat, lon)
    
    # Step 2: Get elevation and slope
    if not debug and not json_mode:
        print("⛰️  Loading stored elevation and slope...")
    
    if json_mode:
        with redirect_stdout(StringIO()):
            elevation = elevation_fetcher._get_elevation(lat, lon) or 50.0
            slope_pct = elevation_fetcher.get_slope(lat, lon)
    else:
        elevation = elevation_fetcher._get_elevation(lat, lon) or 50.0
        slope_pct = elevation_fetcher.get_slope(lat, lon)
    
    # Step 3: Get rainfall forecast  
    if not debug and not json_mode:
        print("🌧️  Fetching rainfall forecast...")
    try:
        if json_mode:
            with redirect_stdout(StringIO()):
                rainfall_mm = weather_fetcher.get_rainfall(lat, lon)
        else:
            rainfall_mm = weather_fetcher.get_rainfall(lat, lon)
    except:
        rainfall_mm = rainfall
        if not debug and not json_mode:
            print(f"⚠️ Warning: Using mock data - OpenWeather API key not configured")
            print(f"🌧️ Mock rainfall forecast (24h): {rainfall_mm}mm")
    
    # Step 4: Calculate flood risk
    if not debug and not json_mode:
        print("🔍 Analyzing surface types with Mask2Former...")
        print("⚠️  Calculating flood risk score...")
    
    if json_mode:
        with redirect_stdout(StringIO()):
            risk_data = risk_scorer.calculate_flood_risk(
                rainfall_mm=rainfall_mm,
                asphalt_pct=surfaces['asphalt'],
                slope_pct=slope_pct,
                drain_pct=0.0,  # Estimated - could be enhanced
                greenery_pct=surfaces['greenery'],
                peak_intensity=rainfall_mm / 2,  # Rough estimate
                drains=drains
            )
    else:
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
    if not debug and not json_mode:
        print("💡 Generating recommendations...")
    
    if json_mode:
        with redirect_stdout(StringIO()):
            recommendations = recommender.generate_recommendations(risk_data, road_type=road_type)
    else:
        recommendations = recommender.generate_recommendations(risk_data, road_type=road_type)
    
    # Prepare segmentation folder info for frontend
    coord_folder = f"{lat}_{lon}"
    segmentation_folder = f"/static/results/{coord_folder}/"
    
    # Create images array with filenames only
    images_list = []
    if segmentation_images:
        # Extract just the filenames from the full paths
        for angle, path in segmentation_images.items():
            if path:
                filename = os.path.basename(path.split('/')[-1])  # Get filename from path
                images_list.append(filename)
        # Sort to ensure consistent order: 0.jpg, 90.jpg, 180.jpg, 270.jpg
        images_list.sort(key=lambda x: int(x.split('.')[0]) if x.split('.')[0].isdigit() else 999)
    
    # Compile results
    results = {
        'coords': {'lat': lat, 'lon': lon},
        'road_type': road_type,
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
        'segmentation_images': segmentation_images,  # Keep for backward compatibility
        'segmentation_folder': segmentation_folder,
        'images': images_list,
        'timestamp': datetime.now().isoformat()
    }
    
    # Step 6: Generate AI insights
    if not debug and not json_mode:
        print("🤖 Generating AI insights...")
    
    # Step 6: Generate AI insights (if available)
    try:
        if ai_insights_generator:
            if json_mode:
                with redirect_stdout(StringIO()):
                    ai_insights = ai_insights_generator.generate_ai_insights(results)
            else:
                ai_insights = ai_insights_generator.generate_ai_insights(results)
            results['ai_insights'] = ai_insights
        else:
            results['ai_insights'] = None
            if not json_mode:
                print("⚠️ Warning: AI insights generator not available")
        
    except Exception as e:
        if not json_mode:
            print(f"⚠️ Warning: AI insights generation failed: {e}")
        results['ai_insights'] = None
    
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
    parser.add_argument('--road-type', type=str, dest='road_type',
                       choices=['residential street', 'highway lane', 'interstate section', 'sidewalk', 'parking lot'],
                       default='residential street', help='Type of road/location context (default: residential street)')
    
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
            road_type=getattr(args, 'road_type', 'residential street'),
            debug=args.debug,
            json_mode=args.json
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
            print(f"📌 RECOMMENDED ACTIONS")
            recs = results['recommendation']
            
            # Show interventions if available (new format)
            if 'interventions' in recs and recs['interventions']:
                for i, intervention in enumerate(recs['interventions'], 1):
                    print(f"   {i}. {intervention['type'].replace('_', ' ').title()}")
                    if 'qty_sqft' in intervention:
                        print(f"      • Area: {intervention['qty_sqft']:,} sq ft")
                    elif 'qty_ft' in intervention:
                        print(f"      • Length: {intervention['qty_ft']:,} ft")
                    elif 'qty_trees' in intervention:
                        print(f"      • Trees: {intervention['qty_trees']} trees")
                    elif 'qty_inlets' in intervention:
                        print(f"      • Inlets: {intervention['qty_inlets']} inlets")
                    print(f"      • Cost: ${intervention['cost_low']:,} - ${intervention['cost_high']:,}")
                    print(f"      • Duration: {intervention['construction_time']}")
                    print(f"      • Flood Reduction: {intervention['flood_reduction_pct']}%")
                    print(f"      • Impact: {intervention['impact_description']}")
                    print()
                
                print(f"💰 ESTIMATED COST")
                total_cost = recs.get('total_cost', {})
                if total_cost:
                    print(f"   Low: ${total_cost['low']:,}")
                    print(f"   Mid: ${total_cost['mid']:,}") 
                    print(f"   High: ${total_cost['high']:,}")
                else:
                    print(f"   Total: ${recs['cost_analysis']['total_estimated_cost']:,}")
                print()
                
                print(f"🕒 CONSTRUCTION TIME")
                print(f"   Total Duration: {recs.get('total_duration', 'Not calculated')}")
                print()
                
                print(f"🚧 COMMUNITY IMPACT")
                print(f"   Road Type: {results.get('road_type', 'Unknown').title()}")
                print(f"   Summary: {recs.get('community_summary', 'Impact assessment not available')}")
                print()
                
                print(f"💧 FLOOD REDUCTION")
                print(f"   Expected Reduction: {recs.get('total_flood_reduction_pct', recs['expected_risk_reduction']['expected_reduction_percentage'])}%")
                
            else:
                # Fallback to legacy format
                print(f"   📈 Expected Risk Reduction: {recs['expected_risk_reduction']['expected_reduction_percentage']:.0f}%")
                print(f"   💰 Total Cost: ${recs['cost_analysis']['total_estimated_cost']:,}")
                if recs['primary_recommendations']:
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
