#!/usr/bin/env python3
"""
AI Insights Generator for Flood Risk Analysis
Uses GPT-4o-mini to generate natural language insights from analysis data.
"""

import os
import json
from typing import Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class AIInsightsGenerator:
    """Generates AI-powered natural language insights from flood analysis data."""
    
    def __init__(self):
        """Initialize the AI insights generator with OpenAI client."""
        self.client = None
        api_key = os.getenv("OPENAI_API_KEY")
        
        if api_key:
            try:
                self.client = OpenAI(api_key=api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize OpenAI client: {e}")
        else:
            print("Warning: OPENAI_API_KEY not found in environment variables")
    
    def generate_ai_insights(self, analysis_json: Dict[str, Any]) -> Optional[str]:
        """
        Generate AI insights from flood analysis JSON data.
        
        Args:
            analysis_json: Complete flood analysis results from the pipeline
            
        Returns:
            Natural language insights or None if AI is unavailable
        """
        if not self.client:
            return None
            
        try:
            # Extract key data for the prompt
            coords = analysis_json.get('coords', {})
            lat = coords.get('lat', 'Unknown')
            lon = coords.get('lon', 'Unknown')
            
            risk = analysis_json.get('risk', {})
            risk_score = risk.get('score', 0)
            risk_level = risk.get('level', 'Unknown')
            
            surfaces = analysis_json.get('surfaces', {})
            asphalt_pct = surfaces.get('asphalt', 0)
            greenery_pct = surfaces.get('greenery', 0)
            
            elevation_m = analysis_json.get('elevation_m', 0)
            slope_pct = analysis_json.get('slope_pct', 0)
            rainfall_mm = analysis_json.get('rainfall_mm', 0)
            
            recommendation = analysis_json.get('recommendation', {})
            interventions = recommendation.get('interventions', [])
            
            # Build the structured prompt
            prompt = f"""You are a flood risk assessment expert analyzing street-level conditions. Provide clear, actionable insights in exactly 4 sections:

**ANALYSIS DATA:**
- Location: {lat}, {lon}
- Elevation: {elevation_m}m
- Terrain slope: {slope_pct}%
- Expected rainfall: {rainfall_mm}mm
- Surface coverage: {asphalt_pct}% asphalt, {greenery_pct}% greenery
- Current flood risk: {risk_score}/100 ({risk_level})
- Available interventions: {len(interventions)} recommended actions

**REQUIRED OUTPUT FORMAT:**

### Terrain & Risk Summary
[2-3 sentences about the elevation, slope, and surface conditions. Explain why this creates the current risk level.]

### Infrastructure Actions
[List the top 3 most cost-effective interventions with format: "• Action Name - Cost range: $X-$Y - Reduces flood risk by Z%"]

### Community Safety
[2-3 sentences about immediate safety actions residents can take, including evacuation routes, shelter-in-place recommendations, or emergency preparedness specific to this risk level.]

### Combined Impact
[1-2 sentences stating the total flood reduction percentage if all interventions are applied, and whether this brings the area to LOW, MEDIUM, or HIGH risk.]

Keep each section concise and actionable. Use specific numbers from the data provided."""

            # Call GPT-4o-mini
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a flood risk assessment expert who provides clear, actionable insights for urban planning and community safety."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.3,  # Lower temperature for more consistent, factual responses
                timeout=30
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating AI insights: {e}")
            return None
    
    def generate_dynamic_insights(self, analysis_json: Dict[str, Any], rainfall_mm: float) -> Optional[str]:
        """
        Generate AI insights for dynamic rainfall scenarios (for slider updates).
        
        Args:
            analysis_json: Base flood analysis results
            rainfall_mm: New rainfall amount from slider
            
        Returns:
            Updated natural language insights or None if AI is unavailable
        """
        if not self.client:
            return None
            
        try:
            # Update the analysis with new rainfall
            updated_analysis = analysis_json.copy()
            updated_analysis['rainfall_mm'] = rainfall_mm
            
            # Recalculate approximate risk score based on rainfall change
            original_rainfall = analysis_json.get('rainfall_mm', 25)
            original_score = analysis_json.get('risk', {}).get('score', 50)
            
            # Simple linear adjustment - in production, this should call the full scoring pipeline
            rainfall_factor = rainfall_mm / max(original_rainfall, 1)
            adjusted_score = min(100, original_score * rainfall_factor)
            
            # Determine new risk level
            if adjusted_score <= 33:
                new_risk_level = "LOW"
            elif adjusted_score <= 66:
                new_risk_level = "MEDIUM"
            else:
                new_risk_level = "HIGH"
            
            updated_analysis['risk'] = {
                'score': adjusted_score,
                'level': new_risk_level
            }
            
            # Generate insights for the updated scenario
            return self.generate_ai_insights(updated_analysis)
            
        except Exception as e:
            print(f"Error generating dynamic AI insights: {e}")
            return None
