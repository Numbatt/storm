#!/usr/bin/env python3
"""
Unified Flood Analysis Script

This script serves as the single entry point for the complete flood risk analysis workflow.
It handles Street View image downloading, segmentation, elevation/slope analysis, flood risk scoring,
and generates actionable recommendations with costs, timelines, and impact assessments.

Usage:
    python run_flood_analysis.py --lat 29.717038748344443 --lon -95.40236732775882 --road-type residential
"""

import argparse
import os
import sys
import json
from pathlib import Path

# Add the backend API directory to Python path for imports
backend_api_path = Path(__file__).parent / "backend" / "api"
sys.path.insert(0, str(backend_api_path))

try:
    from src.data_fetch.streetview import StreetViewFetcher
    from src.data_fetch.elevation import ElevationFetcher
    from src.vision.mask2former_detector import Mask2FormerDetector
    from src.scoring.flood_score import FloodRiskScorer
    from src.recommend.recommender import FloodMitigationRecommender
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this script from the project root directory.")
    print("Required modules should be in backend/api/src/")
    sys.exit(1)


class FloodAnalysisWorkflow:
    """Complete flood analysis workflow orchestrator."""
    
    def __init__(self, config_path: str = None):
        """Initialize the workflow with all required components."""
        if config_path is None:
            config_path = backend_api_path / "config.yaml"
        
        self.config_path = str(config_path)
        self.data_dir = backend_api_path / "data" / "processed"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize all components
        try:
            print("🔧 Initializing flood analysis components...")
            self.streetview_fetcher = StreetViewFetcher(self.config_path)
            self.elevation_fetcher = ElevationFetcher(self.config_path)
            self.surface_detector = Mask2FormerDetector(self.config_path, debug=False)
            self.risk_scorer = FloodRiskScorer(self.config_path)
            self.recommender = FloodMitigationRecommender(self.config_path)
            print("✅ All components initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize components: {e}")
            sys.exit(1)
    
    def run_analysis(self, lat: float, lon: float, road_type: str = "residential",
                    rainfall: float = 25.0, drains: str = "unknown") -> dict:
        """
        Run the complete flood analysis workflow.
        
        Args:
            lat: Latitude coordinate
            lon: Longitude coordinate  
            road_type: Type of road/location context
            rainfall: Rainfall amount in mm (default 25)
            drains: Drainage condition ('ok', 'none', 'unknown')
            
        Returns:
            Complete analysis results dictionary
        """
        print(f"\n🌊 Starting flood analysis for {lat}, {lon}")
        print(f"📍 Location type: {road_type}")
        print(f"🌧️ Rainfall scenario: {rainfall}mm")
        print("=" * 60)
        
        # Step 1: Check for existing images or download them
        print("\n1️⃣ STREET VIEW IMAGE ACQUISITION")
        image_paths = self._get_or_download_images(lat, lon)
        
        # Step 2: Run segmentation pipeline
        print("\n2️⃣ SURFACE SEGMENTATION ANALYSIS")
        surfaces = self._analyze_surfaces(image_paths)
        
        # Step 3: Get elevation and slope data
        print("\n3️⃣ TERRAIN ANALYSIS")
        elevation, slope = self._analyze_terrain(lat, lon)
        
        # Step 4: Calculate flood risk score
        print("\n4️⃣ FLOOD RISK ASSESSMENT")
        risk_analysis = self._calculate_flood_risk(rainfall, slope, surfaces, drains)
        
        # Step 5: Generate recommendations
        print("\n5️⃣ MITIGATION RECOMMENDATIONS")
        recommendations = self._generate_recommendations(risk_analysis, road_type)
        
        # Step 6: Aggregate results
        print("\n6️⃣ RESULTS AGGREGATION")
        final_results = self._aggregate_results(
            lat, lon, road_type, rainfall, drains,
            surfaces, elevation, slope, risk_analysis, recommendations
        )
        
        return final_results
    
    def _get_or_download_images(self, lat: float, lon: float) -> list:
        """Check for existing images or download from Street View API."""
        # Check for existing images
        image_patterns = [
            f"{lat}_{lon}_0.jpg",
            f"{lat}_{lon}_90.jpg", 
            f"{lat}_{lon}_180.jpg",
            f"{lat}_{lon}_270.jpg"
        ]
        
        existing_images = []
        for pattern in image_patterns:
            image_path = self.data_dir / pattern
            if image_path.exists():
                existing_images.append(str(image_path))
        
        if len(existing_images) == 4:
            print(f"✅ Found all 4 existing images for coordinates {lat}, {lon}")
            for img in existing_images:
                print(f"   📸 {Path(img).name}")
            return existing_images
        
        # Download missing images
        print(f"📥 Downloading Street View images for {lat}, {lon}...")
        print("   Headings: [0°, 90°, 180°, 270°] with FOV=90°")
        
        try:
            downloaded_images = self.streetview_fetcher.fetch_images(lat, lon, str(self.data_dir))
            print(f"✅ Successfully downloaded {len(downloaded_images)} images")
            return downloaded_images
        except Exception as e:
            print(f"❌ Failed to download Street View images: {e}")
            raise
    
    def _analyze_surfaces(self, image_paths: list) -> dict:
        """Run Mask2Former segmentation on images."""
        print(f"🔍 Running Mask2Former segmentation on {len(image_paths)} images...")
        print("   Using Mapillary Vistas pretrained weights")
        
        surfaces = self.surface_detector.analyze_local_images(image_paths)
        
        # Verify percentages sum to approximately 100%
        total_percent = sum(surfaces.values())
        print(f"📊 Surface coverage analysis complete:")
        print(f"   🛣️  Asphalt: {surfaces['asphalt']:.1f}%")
        print(f"   🌿 Greenery: {surfaces['greenery']:.1f}%")
        print(f"   📦 Other: {surfaces['other']:.1f}%")
        print(f"   ✅ Total: {total_percent:.1f}% (should be ~100%)")
        
        if abs(total_percent - 100.0) > 5.0:
            print(f"   ⚠️  Warning: Total percentage deviation: {abs(total_percent - 100.0):.1f}%")
        
        return surfaces
    
    def _analyze_terrain(self, lat: float, lon: float) -> tuple:
        """Get elevation and slope values for coordinates."""
        print(f"🏔️ Retrieving terrain data for {lat}, {lon}...")
        
        # Get elevation in meters
        elevation = self.elevation_fetcher.get_elevation(lat, lon)
        if elevation is None:
            elevation = 50.0  # Default fallback
            print(f"   ⚠️  Using default elevation: {elevation}m")
        else:
            print(f"   📊 Elevation: {elevation:.1f}m")
        
        # Get slope percentage
        slope = self.elevation_fetcher.get_slope(lat, lon)
        print(f"   📊 Slope: {slope:.2f}%")
        
        return elevation, slope
    
    def _calculate_flood_risk(self, rainfall: float, slope: float, surfaces: dict, drains: str) -> dict:
        """Calculate flood risk score and analysis."""
        print(f"⚡ Computing flood risk score...")
        print(f"   Parameters: {rainfall}mm rainfall, {slope:.2f}% slope, drains={drains}")
        
        # Use the enhanced scoring method
        risk_analysis = self.risk_scorer.calculate_flood_risk(
            rainfall_mm=rainfall,
            asphalt_pct=surfaces['asphalt'],
            slope_pct=slope,
            drain_pct=5.0,  # Default value for drain percentage
            greenery_pct=surfaces['greenery'],
            drains=drains
        )
        
        score = risk_analysis['flood_risk_score']
        level = risk_analysis['risk_level']
        
        print(f"   🎯 Risk Score: {score:.1f}/100")
        print(f"   📊 Risk Level: {level}")
        print(f"   📝 Description: {risk_analysis['risk_category']['description']}")
        
        return risk_analysis
    
    def _generate_recommendations(self, risk_analysis: dict, road_type: str) -> dict:
        """Generate actionable recommendations with costs and impacts."""
        print(f"💡 Generating recommendations for {road_type}...")
        
        recommendations = self.recommender.generate_recommendations(risk_analysis, road_type)
        
        interventions = recommendations['interventions']
        print(f"   ✅ Generated {len(interventions)} interventions:")
        
        for intervention in interventions:
            print(f"      • {intervention['type'].replace('_', ' ').title()}")
            print(f"        Cost: ${intervention['cost_low']:,} - ${intervention['cost_high']:,}")
            print(f"        Time: {intervention['construction_time']}")
            print(f"        Flood reduction: {intervention['flood_reduction_pct']}%")
        
        total_cost = recommendations['total_cost']
        print(f"   💰 Total cost range: ${total_cost['low']:,} - ${total_cost['high']:,}")
        print(f"   ⏱️ Total duration: {recommendations['total_duration']}")
        print(f"   🎯 Expected flood reduction: {recommendations['total_flood_reduction_pct']}%")
        
        return recommendations
    
    def _aggregate_results(self, lat: float, lon: float, road_type: str, rainfall: float, drains: str,
                          surfaces: dict, elevation: float, slope: float, 
                          risk_analysis: dict, recommendations: dict) -> dict:
        """Aggregate all results into final structured output with consistency validation."""
        print("📋 Aggregating final results...")
        
        # Calculate total metrics
        total_cost = recommendations['total_cost']
        total_duration = recommendations['total_duration']
        total_flood_reduction = recommendations['total_flood_reduction_pct']
        
        # Validate consistency before creating final results
        self._validate_summary_consistency(recommendations, total_duration, total_flood_reduction)
        
        final_results = {
            'location': {
                'latitude': lat,
                'longitude': lon,
                'road_type': road_type
            },
            'input_parameters': {
                'rainfall_mm': rainfall,
                'drainage_condition': drains
            },
            'terrain_analysis': {
                'elevation_meters': elevation,
                'slope_percentage': slope
            },
            'surface_coverage': surfaces,
            'flood_risk': {
                'score': risk_analysis['flood_risk_score'],
                'level': risk_analysis['risk_level'],
                'description': risk_analysis['risk_category']['description']
            },
            'interventions': recommendations['interventions'],
            'summary': {
                'total_interventions': len(recommendations['interventions']),
                'total_cost_range': {
                    'low': total_cost['low'],
                    'mid': total_cost['mid'], 
                    'high': total_cost['high']
                },
                'total_construction_duration': total_duration,
                'expected_flood_reduction_pct': total_flood_reduction,
                'community_impact': recommendations['community_summary']
            }
        }
        
        print("✅ Results aggregation complete")
        return final_results
    
    def _validate_summary_consistency(self, recommendations: dict, total_duration: str, total_flood_reduction: int):
        """Validate consistency in summary aggregation to prevent mismatched values."""
        print("🔍 Validating summary consistency...")
        
        interventions = recommendations.get('interventions', [])
        
        # Validate flood reduction percentage is capped at 80%
        if total_flood_reduction > 80:
            print(f"⚠️  Warning: Flood reduction {total_flood_reduction}% exceeds 80% cap")
        
        # Validate that total cost components are consistent
        total_cost = recommendations.get('total_cost', {})
        if total_cost.get('low', 0) > total_cost.get('mid', 0) or total_cost.get('mid', 0) > total_cost.get('high', 0):
            print("⚠️  Warning: Total cost ranges are inconsistent (low > mid > high)")
        
        # Validate that duration parsing makes sense
        duration_parts = total_duration.lower().split()
        if any(word in total_duration.lower() for word in ['days', 'weeks', 'months']):
            try:
                # Extract numeric part for validation
                numeric_part = [int(s) for s in duration_parts if s.isdigit()]
                if not numeric_part:
                    print(f"⚠️  Warning: Could not parse numeric value from duration: {total_duration}")
            except ValueError:
                print(f"⚠️  Warning: Invalid duration format: {total_duration}")
        
        # Validate community impact string contains expected severity level
        community_summary = recommendations.get('community_summary', '')
        if interventions:
            severities = [i.get('impact_severity', 'UNKNOWN') for i in interventions]
            expected_severities = ['LOW', 'MEDIUM', 'HIGH']
            has_valid_severity = any(severity in expected_severities for severity in severities)
            
            if not has_valid_severity:
                print(f"⚠️  Warning: No valid severity levels found in interventions: {severities}")
        
        # Validate that number of interventions matches
        if len(interventions) == 0 and total_flood_reduction > 0:
            print(f"⚠️  Warning: No interventions but flood reduction is {total_flood_reduction}%")
        
        # Check for unrealistic combinations
        if len(interventions) > 4:
            print(f"⚠️  Warning: Large number of interventions ({len(interventions)}) may be unrealistic")
        
        print("✅ Summary consistency validation complete")


def print_human_readable_report(results: dict):
    """Print a comprehensive human-readable report."""
    location = results['location']
    terrain = results['terrain_analysis']
    surfaces = results['surface_coverage']
    risk = results['flood_risk']
    interventions = results['interventions']
    summary = results['summary']
    
    print("\n" + "=" * 80)
    print("🌊 FLOOD RISK ANALYSIS REPORT")
    print("=" * 80)
    
    # Location and basic info
    print(f"\n📍 LOCATION ANALYSIS")
    print(f"Coordinates: {location['latitude']}, {location['longitude']}")
    print(f"Location Type: {location['road_type']}")
    print(f"Rainfall Scenario: {results['input_parameters']['rainfall_mm']}mm")
    print(f"Drainage Condition: {results['input_parameters']['drainage_condition']}")
    
    # Terrain analysis
    print(f"\n🏔️ TERRAIN CHARACTERISTICS")
    print(f"Elevation: {terrain['elevation_meters']:.1f} meters")
    print(f"Slope: {terrain['slope_percentage']:.2f}%")
    
    # Surface coverage
    print(f"\n📊 SURFACE COVERAGE ANALYSIS")
    print(f"Asphalt/Impermeable: {surfaces['asphalt']:.1f}%")
    print(f"Greenery/Vegetation: {surfaces['greenery']:.1f}%")
    print(f"Other Surfaces: {surfaces['other']:.1f}%")
    total_surface = sum(surfaces.values())
    print(f"Total: {total_surface:.1f}%")
    
    # Risk assessment
    print(f"\n⚡ FLOOD RISK ASSESSMENT")
    print(f"Risk Score: {risk['score']:.1f}/100")
    print(f"Risk Level: {risk['level']}")
    print(f"Assessment: {risk['description']}")
    
    # Interventions
    print(f"\n💡 RECOMMENDED INTERVENTIONS")
    print(f"Total Interventions: {len(interventions)}")
    print("-" * 40)
    
    for i, intervention in enumerate(interventions, 1):
        print(f"\n{i}. {intervention['type'].replace('_', ' ').title()}")
        
        # Quantity details
        if 'qty_sqft' in intervention:
            print(f"   Quantity: {intervention['qty_sqft']:,} sq ft")
        elif 'qty_ft' in intervention:
            print(f"   Quantity: {intervention['qty_ft']:,} linear ft")
        elif 'qty_trees' in intervention:
            print(f"   Quantity: {intervention['qty_trees']} trees")
        elif 'qty_inlets' in intervention:
            print(f"   Quantity: {intervention['qty_inlets']} drainage inlets")
        
        print(f"   Cost Range: ${intervention['cost_low']:,} - ${intervention['cost_high']:,}")
        print(f"   Construction Time: {intervention['construction_time']}")
        print(f"   Community Impact: {intervention['impact_description']}")
        print(f"   Impact Severity: {intervention['impact_severity']}")
        print(f"   Flood Reduction: {intervention['flood_reduction_pct']}%")
    
    # Summary totals
    print(f"\n📋 SUMMARY TOTALS")
    cost_range = summary['total_cost_range']
    print(f"Total Cost Range: ${cost_range['low']:,} - ${cost_range['high']:,}")
    print(f"Estimated Mid-Range Cost: ${cost_range['mid']:,}")
    print(f"Total Construction Duration: {summary['total_construction_duration']}")
    print(f"Combined Flood Reduction: {summary['expected_flood_reduction_pct']}%")
    print(f"Community Impact Summary: {summary['community_impact']}")
    
    print("\n" + "=" * 80)
    print("✅ ANALYSIS COMPLETE")
    print("=" * 80)


def main():
    """Main entry point for the flood analysis script."""
    parser = argparse.ArgumentParser(
        description="Unified Flood Risk Analysis Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python run_flood_analysis.py --lat 29.717038748344443 --lon -95.40236732775882 --road-type residential
    python run_flood_analysis.py --lat 37.7749 --lon -122.4194 --road-type "highway lane" --rainfall 30
    python run_flood_analysis.py --lat 29.715820777907464 --lon -95.40178894546409 --road-type "parking lot" --drains ok
        """
    )
    
    parser.add_argument(
        '--lat', type=float, required=True,
        help='Latitude coordinate for analysis'
    )
    parser.add_argument(
        '--lon', type=float, required=True, 
        help='Longitude coordinate for analysis'
    )
    parser.add_argument(
        '--road-type', type=str, default='residential',
        choices=['residential', 'highway lane', 'interstate section', 'sidewalk', 'parking lot'],
        help='Type of road/location context (default: residential)'
    )
    parser.add_argument(
        '--rainfall', type=float, default=25.0,
        help='Rainfall amount in mm (default: 25)'
    )
    parser.add_argument(
        '--drains', type=str, default='unknown',
        choices=['ok', 'none', 'unknown'],
        help='Drainage condition (default: unknown)'
    )
    parser.add_argument(
        '--json', action='store_true',
        help='Output results in JSON format instead of human-readable report'
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize and run workflow
        workflow = FloodAnalysisWorkflow()
        results = workflow.run_analysis(
            lat=args.lat,
            lon=args.lon,
            road_type=args.road_type,
            rainfall=args.rainfall,
            drains=args.drains
        )
        
        # Output results
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            print_human_readable_report(results)
        
    except KeyboardInterrupt:
        print("\n\n❌ Analysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
