#!/usr/bin/env python3
"""
Minimal FastAPI application for flood risk assessment.

Provides REST API endpoints for elevation queries, risk assessment,
and grid metadata using processed DEM and flow accumulation data.
"""

import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import traceback

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from grid import Grid
from risk import FloodRiskAssessment, RiskParameters
from schemas import (
    RiskAssessmentRequest, RiskAssessmentResponse,
    BulkRiskAssessmentRequest, BulkRiskAssessmentResponse,
    GridRiskRequest, GridRiskResponse,
    TieredRiskAreasRequest, TieredRiskAreasResponse,
    PointQuery, PointElevationResponse,
    HealthResponse, PreprocessingStatus,
    ErrorResponse, APIResponse,
    RiskModelConfig
)
from utils.io_utils import check_data_integrity, list_data_files


# Global variables for cached objects
app = FastAPI(
    title="Ponding Twin API",
    description="Flood risk assessment API using hydrological modeling",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global objects
grid: Optional[Grid] = None
risk_model: Optional[FloodRiskAssessment] = None
risk_config: RiskModelConfig = RiskModelConfig(drainage_coefficient=0.000001)


def initialize_models(data_dir: str = "data") -> bool:
    """
    Initialize grid and risk assessment models.

    Args:
        data_dir: Directory containing processed data

    Returns:
        True if successful, False otherwise
    """
    global grid, risk_model

    try:
        # Initialize grid
        grid = Grid(data_dir)

        if grid.elevation is None:
            print("Warning: Grid data not loaded. Run preprocessing first.")
            return False

        # Initialize risk model
        risk_params = RiskParameters(
            drainage_coefficient=risk_config.drainage_coefficient,
            ponding_threshold_mm=risk_config.ponding_threshold_mm,
            high_flow_accum_threshold=risk_config.high_flow_accum_threshold,
            elevation_weight=risk_config.elevation_weight,
            flow_accum_weight=risk_config.flow_accum_weight,
            rainfall_weight=risk_config.rainfall_weight
        )

        risk_model = FloodRiskAssessment(grid, risk_params)

        print("Models initialized successfully")
        return True

    except Exception as e:
        print(f"Error initializing models: {e}")
        traceback.print_exc()
        return False


@app.on_event("startup")
async def startup_event():
    """Initialize models on startup."""
    success = initialize_models()
    if not success:
        print("Warning: Models not fully initialized. Some endpoints may not work.")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    data_files = list_data_files("data")

    return HealthResponse(
        status="healthy" if grid and risk_model else "degraded",
        timestamp=datetime.now().isoformat(),
        grid_loaded=grid is not None and grid.elevation is not None,
        data_files_available=[
            filename for file_list in data_files.values()
            for file_info in file_list
            for filename in [file_info.get('name', '')]
            if filename
        ],
        system_info={
            "python_version": sys.version,
            "working_directory": os.getcwd(),
            "data_directory_exists": os.path.exists("data")
        }
    )


@app.get("/meta")
async def get_metadata():
    """Get grid metadata and bounds information."""
    if not grid:
        raise HTTPException(status_code=503, detail="Grid not initialized")

    try:
        metadata = grid.get_metadata()
        return APIResponse(success=True, data=metadata)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving metadata: {e}")


@app.get("/preprocessing-status", response_model=PreprocessingStatus)
async def get_preprocessing_status():
    """Check preprocessing status and data availability."""
    data_integrity = check_data_integrity("data")

    required_files = ['Z.npy', 'ACC.npy', 'georef.json']
    available_files = []
    missing_files = []

    for filename in required_files:
        if filename not in data_integrity.get("files_missing", []):
            available_files.append(filename)
        else:
            missing_files.append(filename)

    return PreprocessingStatus(
        preprocessing_required=len(missing_files) > 0,
        available_files=available_files,
        missing_files=missing_files,
        last_processed=None  # Could track this with file timestamps
    )


@app.get("/point", response_model=PointElevationResponse)
async def get_point_elevation(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude")
):
    """Get elevation and flow accumulation at a specific point."""
    if not grid:
        raise HTTPException(status_code=503, detail="Grid not initialized")

    try:
        within_bounds = grid.is_within_bounds(lat, lon)
        elevation = grid.get_elevation(lat, lon) if within_bounds else None
        flow_accum = grid.get_flow_accumulation(lat, lon) if within_bounds else None

        return PointElevationResponse(
            location={"lat": lat, "lon": lon},
            elevation_m=elevation,
            flow_accumulation=flow_accum,
            within_bounds=within_bounds
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying point: {e}")


@app.post("/risk/assess", response_model=RiskAssessmentResponse)
async def assess_risk(request: RiskAssessmentRequest):
    """Assess flood risk at a specific point."""
    if not risk_model:
        raise HTTPException(status_code=503, detail="Risk model not initialized")

    try:
        # Convert rainfall scenario to parameters dict
        rainfall_params = None
        if request.rainfall_scenario:
            rainfall_params = {
                "rainfall_mm_per_hour": request.rainfall_scenario.rainfall_mm_per_hour,
                "duration_hours": request.rainfall_scenario.duration_hours
            }
            # Note: Point assessment doesn't use caching, so no cache invalidation needed

        # Perform risk assessment
        result = risk_model.assess_point_risk(
            request.location.lat,
            request.location.lon,
            rainfall_params
        )

        # Check for errors in result
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return RiskAssessmentResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error assessing risk: {e}")


@app.post("/risk/bulk", response_model=BulkRiskAssessmentResponse)
async def assess_bulk_risk(request: BulkRiskAssessmentRequest):
    """Assess flood risk for multiple points."""
    if not risk_model:
        raise HTTPException(status_code=503, detail="Risk model not initialized")

    if len(request.locations) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 locations per request")

    try:
        # Convert rainfall scenario to parameters dict
        rainfall_params = None
        if request.rainfall_scenario:
            rainfall_params = {
                "rainfall_mm_per_hour": request.rainfall_scenario.rainfall_mm_per_hour,
                "duration_hours": request.rainfall_scenario.duration_hours
            }

        results = []
        errors = []

        for i, location in enumerate(request.locations):
            try:
                result = risk_model.assess_point_risk(
                    location.lat, location.lon, rainfall_params
                )

                if "error" in result:
                    errors.append({
                        "index": i,
                        "location": {"lat": location.lat, "lon": location.lon},
                        "error": result["error"]
                    })
                else:
                    results.append(RiskAssessmentResponse(**result))

            except Exception as e:
                errors.append({
                    "index": i,
                    "location": {"lat": location.lat, "lon": location.lon},
                    "error": str(e)
                })

        # Generate summary statistics
        if results:
            risk_scores = [r.risk_score for r in results]
            summary = {
                "total_points": len(request.locations),
                "successful_assessments": len(results),
                "errors": len(errors),
                "risk_summary": {
                    "mean_risk": sum(risk_scores) / len(risk_scores),
                    "max_risk": max(risk_scores),
                    "min_risk": min(risk_scores)
                }
            }
        else:
            summary = {
                "total_points": len(request.locations),
                "successful_assessments": 0,
                "errors": len(errors),
                "risk_summary": None
            }

        return BulkRiskAssessmentResponse(
            results=results,
            errors=errors,
            summary=summary
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in bulk assessment: {e}")


@app.post("/risk/grid", response_model=GridRiskResponse)
async def assess_grid_risk(request: GridRiskRequest):
    """Assess flood risk across the entire grid."""
    if not risk_model:
        raise HTTPException(status_code=503, detail="Risk model not initialized")

    try:
        # Convert rainfall scenario to parameters dict
        rainfall_params = None
        if request.rainfall_scenario:
            rainfall_params = {
                "rainfall_mm_per_hour": request.rainfall_scenario.rainfall_mm_per_hour,
                "duration_hours": request.rainfall_scenario.duration_hours
            }
            # Invalidate cache when parameters change (for get_risk_statistics method)
            risk_model.invalidate_cache()

        # Get overall statistics
        statistics = risk_model.get_risk_statistics()

        # Get high-risk areas
        high_risk_areas = risk_model.get_high_risk_areas(
            min_risk_score=request.min_risk_threshold or 0.6
        )

        # Prepare scenario info
        if rainfall_params:
            scenario_info = {
                "rainfall_mm_per_hour": rainfall_params["rainfall_mm_per_hour"],
                "duration_hours": rainfall_params["duration_hours"],
                "total_rainfall_mm": rainfall_params["rainfall_mm_per_hour"] * rainfall_params["duration_hours"]
            }
        else:
            scenario_info = {
                "rainfall_mm_per_hour": risk_model.params.rainfall_mm_per_hour,
                "duration_hours": risk_model.params.duration_hours,
                "total_rainfall_mm": risk_model.params.rainfall_mm_per_hour * risk_model.params.duration_hours
            }

        return GridRiskResponse(
            statistics=statistics,
            high_risk_areas=high_risk_areas,
            scenario=scenario_info
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in grid assessment: {e}")


@app.post("/risk/tiered", response_model=TieredRiskAreasResponse)
async def assess_tiered_risk_areas(request: TieredRiskAreasRequest):
    """Get risk areas organized by tiers for better visualization."""
    if not risk_model:
        raise HTTPException(status_code=503, detail="Risk model not initialized")

    try:
        # Update risk model parameters if rainfall scenario provided
        if request.rainfall_scenario:
            risk_model.params.rainfall_mm_per_hour = request.rainfall_scenario.rainfall_mm_per_hour
            risk_model.params.duration_hours = request.rainfall_scenario.duration_hours
            # Invalidate cache when parameters change
            risk_model.invalidate_cache()

        # Get tiered risk areas
        tiered_areas = risk_model.get_tiered_risk_areas(
            max_areas_per_tier=request.max_areas_per_tier
        )

        # Filter by enabled tiers
        filtered_areas = {}
        for tier in ['very_high', 'high', 'moderate', 'low']:
            if tier in request.enabled_tiers:
                filtered_areas[tier] = tiered_areas[tier]
            else:
                filtered_areas[tier] = []

        # Prepare scenario info
        scenario_info = {
            "rainfall_mm_per_hour": risk_model.params.rainfall_mm_per_hour,
            "duration_hours": risk_model.params.duration_hours,
            "total_rainfall_mm": risk_model.params.rainfall_mm_per_hour * risk_model.params.duration_hours
        }

        # Count areas by tier
        total_areas_by_tier = {
            tier: len(areas) for tier, areas in tiered_areas.items()
        }

        return TieredRiskAreasResponse(
            very_high=filtered_areas['very_high'],
            high=filtered_areas['high'],
            moderate=filtered_areas['moderate'],
            low=filtered_areas['low'],
            scenario=scenario_info,
            total_areas_by_tier=total_areas_by_tier
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in tiered risk assessment: {e}")


@app.get("/config/risk", response_model=RiskModelConfig)
async def get_risk_config():
    """Get current risk model configuration."""
    return risk_config


@app.post("/config/risk")
async def update_risk_config(config: RiskModelConfig, background_tasks: BackgroundTasks):
    """Update risk model configuration."""
    global risk_config, risk_model

    try:
        # Update global config
        risk_config = config

        # Reinitialize risk model with new parameters
        def reinitialize():
            global risk_model
            if grid and grid.elevation is not None:
                risk_params = RiskParameters(
                    drainage_coefficient=config.drainage_coefficient,
                    ponding_threshold_mm=config.ponding_threshold_mm,
                    high_flow_accum_threshold=config.high_flow_accum_threshold,
                    elevation_weight=config.elevation_weight,
                    flow_accum_weight=config.flow_accum_weight,
                    rainfall_weight=config.rainfall_weight
                )
                risk_model = FloodRiskAssessment(grid, risk_params)

        background_tasks.add_task(reinitialize)

        return APIResponse(
            success=True,
            data={"message": "Risk model configuration updated"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating configuration: {e}")


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    print(f"Unhandled exception: {exc}")
    traceback.print_exc()

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail="An unexpected error occurred"
        ).dict()
    )


def main():
    """Main function to run the FastAPI application."""
    import argparse

    parser = argparse.ArgumentParser(description="Ponding Twin API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    parser.add_argument("--data-dir", default="data", help="Data directory path")

    args = parser.parse_args()

    # Change to data directory if specified
    if args.data_dir != "data":
        os.environ["DATA_DIR"] = args.data_dir

    print(f"Starting Ponding Twin API server on {args.host}:{args.port}")
    print(f"Data directory: {args.data_dir}")
    print(f"API documentation: http://{args.host}:{args.port}/docs")

    uvicorn.run(
        "app:app",
        host=args.host,
        port=args.port,
        reload=args.reload
    )


if __name__ == "__main__":
    main()