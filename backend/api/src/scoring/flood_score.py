"""
Flood Risk Scoring Algorithm
Calculates flood risk scores based on rainfall, surface types, slope, and drainage.
"""

import yaml
from typing import Dict, Tuple


class FloodRiskScorer:
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize with configuration file."""
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Load thresholds and weights from config
        self.thresholds = self.config['flood_risk']['thresholds']
        self.weights = self.config['flood_risk']['weights']
    
    def compute_score(self, rainfall: float, slope: float, surfaces: Dict[str, float], 
                     drains: str = "unknown") -> Dict[str, any]:
        """
        Compute calibrated flood risk score using normalized features and weighted combination.
        
        Args:
            rainfall: Rainfall amount in mm
            slope: Slope percentage
            surfaces: Dictionary with asphalt, greenery percentages
            drains: Drainage condition ("ok", "none", "unknown")
            
        Returns:
            Dictionary with score and level
        """
        asphalt_pct = surfaces.get('asphalt', 0)
        greenery_pct = surfaces.get('greenery', 0)
        other_pct = surfaces.get('other', 0)
        
        # Step 2: Normalize all inputs to [0,1] range
        A = asphalt_pct / 100.0  # Asphalt percentage
        G = greenery_pct / 100.0  # Greenery percentage  
        S = min(1.0, slope / 5.0)  # Slope normalized by 5% (safe threshold)
        R = min(1.0, rainfall / 50.0)  # Rainfall normalized by 50mm design storm
        
        # Step 3: Feature transforms
        flatness = 1.0 - S  # Flatter areas are riskier
        lowgreen = 1.0 - G  # Less vegetation is riskier
        
        # Drain penalties
        drain_penalties = {"none": 0.15, "ok": -0.05, "unknown": 0.0}
        drain_pen = drain_penalties.get(drains.lower(), 0.0)
        
        # Step 4: Risk combination with weighted sum and nonlinearity
        risk_raw = (0.35 * A + 0.25 * flatness + 0.25 * R + 0.15 * lowgreen) + drain_pen
        risk_0_100 = min(100.0, max(0.0, 100.0 * (risk_raw ** 1.2)))
        
        # Step 5: Guardrails
        guardrail_applied = None
        if slope < 1.5 and asphalt_pct > 20 and rainfall >= 50:
            # Heavy rain + flat + high asphalt: minimum floor of 30
            if risk_0_100 < 30:
                risk_0_100 = 30.0
                guardrail_applied = "minimum_floor_heavy_rain"
        elif greenery_pct > 50 and slope > 3 and rainfall <= 25:
            # Light rain + steep + high greenery: maximum cap of 25
            if risk_0_100 > 25:
                risk_0_100 = 25.0
                guardrail_applied = "maximum_cap_light_rain"
        
        final_score = risk_0_100
        
        # Step 6: Risk level buckets (0-24=LOW, 25-59=MEDIUM, 60-100=HIGH)
        if final_score < 25:
            level = "LOW"
        elif final_score < 60:
            level = "MEDIUM"
        else:
            level = "HIGH"
        
        # Step 8: Debug logging
        print(f"Normalized features: A={A:.2f}, G={G:.2f}, S={S:.2f}, R={R:.2f}, "
              f"flatness={flatness:.2f}, lowgreen={lowgreen:.2f}, drain_pen={drain_pen:.2f}")
        if guardrail_applied:
            print(f"⚠️ Guardrail applied: {guardrail_applied}")
        print(f"⚠️ Flood Risk Score: {final_score:.1f}/100 ({level})")
        
        result = {
            'score': final_score,
            'level': level,
            'normalized_features': {
                'asphalt': A,
                'greenery': G, 
                'slope': S,
                'rainfall': R,
                'flatness': flatness,
                'lowgreen': lowgreen,
                'drain_penalty': drain_pen
            },
            'guardrail_applied': guardrail_applied,
            'components': {
                'rainfall_impact': self._assess_rainfall(rainfall),
                'surface_impact': self._assess_surface(asphalt_pct),
                'slope_impact': self._assess_slope(slope),
                'drainage_impact': self._assess_drains(drains),
                'greenery_benefit': self._assess_greenery(greenery_pct)
            }
        }
        
        return result
    
    def calculate_flood_risk(self, rainfall_mm: float, asphalt_pct: float, 
                           slope_pct: float, drain_pct: float, 
                           greenery_pct: float, peak_intensity: float = 0,
                           drains: str = "unknown") -> Dict:
        """
        Calculate comprehensive flood risk assessment.
        
        Args:
            rainfall_mm: Total rainfall in mm
            asphalt_pct: Percentage of asphalt/impermeable surface
            slope_pct: Slope percentage
            drain_pct: Percentage of drainage infrastructure
            greenery_pct: Percentage of greenery/vegetation
            peak_intensity: Peak rainfall intensity (mm/hour)
            
        Returns:
            Comprehensive flood risk analysis dictionary
        """
        surfaces = {
            'asphalt': asphalt_pct,
            'greenery': greenery_pct,
            'drains': drain_pct
        }
        
        # Get base score computation
        base_result = self.compute_score(rainfall_mm, slope_pct, surfaces, drains)
        
        # Enhanced result with additional analysis
        return {
            'flood_risk_score': base_result['score'],
            'risk_level': base_result['level'],
            'risk_category': {
                'description': self._get_risk_description(base_result['level']),
                'score_range': self._get_score_range(base_result['level'])
            },
            'components': base_result['components'],
            'analysis': {
                'primary_concerns': self._identify_primary_concerns(surfaces, slope_pct, rainfall_mm),
                'contributing_factors': self._analyze_contributing_factors(surfaces, slope_pct, rainfall_mm, peak_intensity),
                'vulnerability_assessment': self._assess_vulnerability(surfaces, slope_pct)
            },
            'input_parameters': {
                'rainfall_mm': rainfall_mm,
                'asphalt_percentage': asphalt_pct,
                'slope_percentage': slope_pct,
                'drain_percentage': drain_pct,
                'greenery_percentage': greenery_pct,
                'peak_intensity_mm_per_hour': peak_intensity
            }
        }
    
    def _get_risk_description(self, level: str) -> str:
        """Get descriptive text for risk level."""
        descriptions = {
            'LOW': 'Minimal flood risk under normal conditions',
            'MEDIUM': 'Moderate flood risk during heavy rainfall',
            'HIGH': 'Significant flood risk requiring mitigation measures',
            'VERY_HIGH': 'Critical flood risk requiring immediate intervention'
        }
        return descriptions.get(level, 'Unknown risk level')
    
    def _get_score_range(self, level: str) -> str:
        """Get score range for risk level."""
        if level == 'LOW':
            return f"0-{self.thresholds['low']}"
        elif level == 'MEDIUM':
            return f"{self.thresholds['low']}-{self.thresholds['medium']}"
        elif level == 'HIGH':
            return f"{self.thresholds['medium']}-{self.thresholds['high']}"
        else:
            return f"{self.thresholds['high']}-100"
    
    def _identify_primary_concerns(self, surfaces: Dict, slope_pct: float, rainfall_mm: float) -> list:
        """Identify primary flood risk concerns."""
        concerns = []
        
        if surfaces['asphalt'] > 70:
            concerns.append("High impermeable surface coverage increases runoff")
        
        if slope_pct < 2:
            concerns.append("Insufficient slope for natural drainage")
        
        if surfaces['drains'] < 5:
            concerns.append("Inadequate drainage infrastructure")
        
        if rainfall_mm > 20:
            concerns.append("Heavy rainfall forecast exceeds system capacity")
        
        if surfaces['greenery'] < 15:
            concerns.append("Limited vegetation for water absorption")
        
        return concerns if concerns else ["No major concerns identified"]
    
    def _analyze_contributing_factors(self, surfaces: Dict, slope_pct: float, 
                                    rainfall_mm: float, peak_intensity: float) -> Dict:
        """Analyze specific contributing factors."""
        return {
            'surface_runoff_factor': min(100, surfaces['asphalt'] * 1.2),
            'drainage_efficiency': surfaces['drains'] * 10,
            'infiltration_capacity': surfaces['greenery'] * 0.8,
            'slope_drainage_benefit': slope_pct * 5,
            'rainfall_stress': min(100, rainfall_mm * 3),
            'intensity_multiplier': min(2.0, peak_intensity / 10 if peak_intensity > 0 else 1.0)
        }
    
    def _assess_vulnerability(self, surfaces: Dict, slope_pct: float) -> str:
        """Assess overall vulnerability level."""
        vulnerability_score = (
            surfaces['asphalt'] * 0.4 +
            (100 - surfaces['greenery']) * 0.3 +
            (100 - surfaces['drains'] * 10) * 0.2 +
            max(0, 10 - slope_pct) * 0.1
        )
        
        if vulnerability_score < 30:
            return "Low vulnerability"
        elif vulnerability_score < 50:
            return "Moderate vulnerability"
        elif vulnerability_score < 70:
            return "High vulnerability"
        else:
            return "Very high vulnerability"
    
    def _assess_rainfall(self, rainfall: float) -> str:
        """Assess rainfall impact level."""
        if rainfall < 5:
            return "Low"
        elif rainfall < 15:
            return "Moderate"
        elif rainfall < 30:
            return "High"
        else:
            return "Very High"
    
    def _assess_surface(self, asphalt_pct: float) -> str:
        """Assess surface permeability impact."""
        if asphalt_pct < 30:
            return "Low (Permeable)"
        elif asphalt_pct < 60:
            return "Moderate (Mixed)"
        elif asphalt_pct < 80:
            return "High (Mostly Impermeable)"
        else:
            return "Very High (Impermeable)"
    
    def _assess_slope(self, slope_pct: float) -> str:
        """Assess slope drainage impact."""
        if slope_pct > 10:
            return "Beneficial (Steep)"
        elif slope_pct > 5:
            return "Moderate"
        elif slope_pct > 2:
            return "Poor (Gentle)"
        else:
            return "Very Poor (Flat)"
    
    def _assess_drainage(self, drains_pct: float) -> str:
        """Assess drainage infrastructure impact."""
        if drains_pct > 8:
            return "Good"
        elif drains_pct > 4:
            return "Adequate"
        elif drains_pct > 1:
            return "Poor"
        else:
            return "Very Poor"
    
    def _assess_greenery(self, greenery_pct: float) -> str:
        """Assess greenery benefits."""
        if greenery_pct > 40:
            return "Very Beneficial"
        elif greenery_pct > 20:
            return "Beneficial"
        elif greenery_pct > 10:
            return "Moderate"
        else:
            return "Limited"
    
    def _assess_drains(self, drains: str) -> str:
        """Assess drainage condition impact."""
        if drains.lower() == "ok":
            return "Good"
        elif drains.lower() == "none":
            return "Very Poor"
        else:  # unknown
            return "Unknown"


def main():
    """Test the calibrated FloodRiskScorer with validation scenarios."""
    scorer = FloodRiskScorer()
    
    # Test scenarios to validate the calibrated scoring
    test_scenarios = [
        {
            "name": "Houston Example (25mm storm)",
            "rainfall": 25,
            "slope": 1.09,
            "surfaces": {"asphalt": 23.9, "greenery": 39.6},
            "drains": "unknown",
            "expected_range": "30-40"
        },
        {
            "name": "Flat + High Asphalt + Heavy Rain",
            "rainfall": 50,
            "slope": 1.0,
            "surfaces": {"asphalt": 80, "greenery": 10},
            "drains": "none",
            "expected_range": "≥40 (MEDIUM/HIGH)"
        },
        {
            "name": "Steep + Low Asphalt + Light Rain",
            "rainfall": 15,
            "slope": 8,
            "surfaces": {"asphalt": 20, "greenery": 60},
            "drains": "ok",
            "expected_range": "≤15 (LOW)"
        },
        {
            "name": "High Greenery Test",
            "rainfall": 25,
            "slope": 2,
            "surfaces": {"asphalt": 30, "greenery": 60},
            "drains": "unknown",
            "expected_range": "Lower than without greenery"
        },
        {
            "name": "Drain Benefit Test",
            "rainfall": 25,
            "slope": 2,
            "surfaces": {"asphalt": 50, "greenery": 30},
            "drains": "ok",
            "expected_range": "5-10 points lower than 'none'"
        }
    ]
    
    print("🧮 Calibrated Flood Risk Scoring - Test Scenarios")
    print("=" * 60)
    
    for scenario in test_scenarios:
        print(f"\n📍 Scenario: {scenario['name']}")
        print("-" * 40)
        print(f"   Input: {scenario['rainfall']}mm rain, {scenario['slope']}% slope")
        print(f"   Surfaces: {scenario['surfaces']['asphalt']}% asphalt, {scenario['surfaces']['greenery']}% greenery")
        print(f"   Drains: {scenario['drains']}")
        
        result = scorer.compute_score(
            rainfall=scenario['rainfall'],
            slope=scenario['slope'],
            surfaces=scenario['surfaces'],
            drains=scenario['drains']
        )
        
        print(f"   Expected: {scenario['expected_range']}")
        print(f"   → Result: {result['score']:.1f}/100 ({result['level']})")
        
        # Show normalized features for validation
        features = result['normalized_features']
        print(f"   Features: A={features['asphalt']:.2f}, G={features['greenery']:.2f}, "
              f"S={features['slope']:.2f}, R={features['rainfall']:.2f}, "
              f"drain_pen={features['drain_penalty']:.2f}")
        
        if result.get('guardrail_applied'):
            print(f"   🛡️ Guardrail: {result['guardrail_applied']}")
        
        print()
    
    print("=" * 60)
    print("✅ Calibrated scoring test completed!")
    print("\nSummary of expected behaviors:")
    print("• Risk buckets: 0-24=LOW, 25-59=MEDIUM, 60-100=HIGH")
    print("• Flat + high asphalt + heavy rain → MEDIUM/HIGH (≥40)")
    print("• Steep + low asphalt + light rain → LOW (≤15)")
    print("• Increasing greenery → monotonically lower scores")
    print("• Good drains → ~5-10 point reduction")
    print("• Houston example → ~30-40/100 for 25mm storm")


if __name__ == "__main__":
    main()