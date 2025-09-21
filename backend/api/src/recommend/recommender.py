"""
Flood Risk Mitigation Recommender
Provides actionable recommendations based on flood risk analysis.
"""

from typing import Dict


class FloodMitigationRecommender:
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize the recommender with rule-based logic."""
        self.config_path = config_path
    
    def generate_recommendations(self, risk_data: Dict) -> Dict:
        """
        Generate flood mitigation recommendations based on flood risk analysis.
        
        Args:
            risk_data: Complete flood risk analysis dictionary
            
        Returns:
            Dictionary with comprehensive recommendations
        """
        # Extract data from risk analysis
        params = risk_data.get('input_parameters', {})
        asphalt_pct = params.get('asphalt_percentage', 0)
        greenery_pct = params.get('greenery_percentage', 0)
        drains_pct = params.get('drain_percentage', 0)
        slope_pct = params.get('slope_percentage', 0)
        rainfall_mm = params.get('rainfall_mm', 0)
        risk_level = risk_data.get('risk_level', 'UNKNOWN')
        risk_score = risk_data.get('flood_risk_score', 0)
        
        # Generate primary recommendations
        primary_recommendations = []
        
        # Rule 1: High asphalt coverage → permeable pavement
        if asphalt_pct > 70:
            primary_recommendations.append({
                'title': 'Install Permeable Pavement',
                'description': f"Replace {asphalt_pct:.1f}% impermeable surface coverage with permeable alternatives to reduce runoff",
                'priority': 'High',
                'estimated_cost': self._estimate_cost('permeable_pavement', asphalt_pct),
                'impact': 'High',
                'timeframe': '6-12 months'
            })
        
        # Rule 2: Low slope → bioswales/green strips  
        if slope_pct < 5:
            primary_recommendations.append({
                'title': 'Create Bioswales and Green Infrastructure',
                'description': f"Install vegetated channels and rain gardens to improve drainage on {slope_pct:.1f}% slope terrain",
                'priority': 'High',
                'estimated_cost': self._estimate_cost('bioswales', slope_pct),
                'impact': 'Medium',
                'timeframe': '3-6 months'
            })
        
        # Rule 3: Insufficient drainage → drainage improvements
        if drains_pct < 5:
            primary_recommendations.append({
                'title': 'Improve Drainage Infrastructure',
                'description': f"Add storm drains and upgrade systems - current {drains_pct:.1f}% coverage is inadequate",
                'priority': 'Critical',
                'estimated_cost': self._estimate_cost('drainage_upgrade', drains_pct),
                'impact': 'Very High',
                'timeframe': '12-18 months'
            })
        
        # Rule 4: Low greenery → vegetation improvements
        if greenery_pct < 20:
            primary_recommendations.append({
                'title': 'Increase Vegetation Coverage',
                'description': f"Plant trees and create green spaces - current {greenery_pct:.1f}% provides limited absorption",
                'priority': 'Medium',
                'estimated_cost': self._estimate_cost('vegetation', greenery_pct),
                'impact': 'Medium',
                'timeframe': '1-3 months'
            })
        
        # Generate secondary recommendations
        secondary_recommendations = self._generate_secondary_recommendations(risk_data)
        
        # Create implementation plan
        implementation_plan = self._create_implementation_plan(primary_recommendations, secondary_recommendations)
        
        # Calculate cost analysis
        cost_analysis = self._calculate_cost_analysis(primary_recommendations, secondary_recommendations)
        
        # Estimate risk reduction
        risk_reduction = self._estimate_risk_reduction(risk_data, primary_recommendations)
        
        result = {
            'primary_recommendations': primary_recommendations[:3],  # Top 3
            'secondary_recommendations': secondary_recommendations,
            'implementation_plan': implementation_plan,
            'cost_analysis': cost_analysis,
            'expected_risk_reduction': risk_reduction,
            'priority_matrix': self._create_priority_matrix(primary_recommendations),
            'risk_context': {
                'current_risk_level': risk_level,
                'risk_score': risk_score,
                'primary_concerns': risk_data.get('analysis', {}).get('primary_concerns', [])
            }
        }
        
        print(f"💡 Generated {len(primary_recommendations)} primary recommendations (Risk: {risk_level})")
        return result
    
    def _estimate_cost(self, recommendation_type: str, parameter_value: float) -> int:
        """Estimate implementation cost for different recommendation types."""
        cost_estimates = {
            'permeable_pavement': lambda val: int(50000 + (val * 1000)),  # $50k base + $1k per %
            'bioswales': lambda val: int(30000 + (10 - val) * 2000),     # More cost for flatter terrain
            'drainage_upgrade': lambda val: int(100000 + (10 - val) * 5000),  # Major infrastructure
            'vegetation': lambda val: int(15000 + (20 - val) * 500)      # Relatively low cost
        }
        
        estimator = cost_estimates.get(recommendation_type, lambda val: 25000)
        return estimator(parameter_value)
    
    def _generate_secondary_recommendations(self, risk_data: Dict) -> list:
        """Generate secondary/supporting recommendations."""
        params = risk_data.get('input_parameters', {})
        risk_level = risk_data.get('risk_level', 'LOW')
        
        secondary = []
        
        # Always recommend monitoring
        secondary.append({
            'title': 'Install Flood Monitoring System',
            'description': 'Set up weather monitoring and early warning systems',
            'priority': 'Medium',
            'estimated_cost': 5000,
            'impact': 'Medium',
            'timeframe': '1-2 months'
        })
        
        # Emergency preparedness
        if risk_level in ['HIGH', 'VERY_HIGH']:
            secondary.append({
                'title': 'Develop Emergency Response Plan',
                'description': 'Create evacuation routes and emergency procedures',
                'priority': 'High',
                'estimated_cost': 10000,
                'impact': 'High',
                'timeframe': '1 month'
            })
        
        # Community engagement
        secondary.append({
            'title': 'Community Education Program',
            'description': 'Educate residents about flood risks and preparation',
            'priority': 'Low',
            'estimated_cost': 3000,
            'impact': 'Medium',
            'timeframe': '2-3 months'
        })
        
        return secondary
    
    def _create_implementation_plan(self, primary: list, secondary: list) -> Dict:
        """Create phased implementation plan."""
        # Sort by priority
        all_recommendations = primary + secondary
        critical = [r for r in all_recommendations if r['priority'] == 'Critical']
        high = [r for r in all_recommendations if r['priority'] == 'High']
        medium = [r for r in all_recommendations if r['priority'] == 'Medium']
        low = [r for r in all_recommendations if r['priority'] == 'Low']
        
        return {
            'phase_1_immediate': {
                'timeframe': '0-3 months',
                'actions': [r['title'] for r in critical + high[:2]]
            },
            'phase_2_short_term': {
                'timeframe': '3-12 months',
                'actions': [r['title'] for r in high[2:] + medium]
            },
            'phase_3_long_term': {
                'timeframe': '12+ months',
                'actions': [r['title'] for r in low]
            }
        }
    
    def _calculate_cost_analysis(self, primary: list, secondary: list) -> Dict:
        """Calculate total cost analysis."""
        primary_costs = [r['estimated_cost'] for r in primary]
        secondary_costs = [r['estimated_cost'] for r in secondary]
        
        return {
            'primary_recommendations_cost': sum(primary_costs),
            'secondary_recommendations_cost': sum(secondary_costs),
            'total_estimated_cost': sum(primary_costs + secondary_costs),
            'cost_breakdown': {
                'immediate_phase': sum([r['estimated_cost'] for r in primary + secondary 
                                       if r['priority'] in ['Critical', 'High']]),
                'long_term_phase': sum([r['estimated_cost'] for r in primary + secondary 
                                       if r['priority'] in ['Medium', 'Low']])
            }
        }
    
    def _estimate_risk_reduction(self, risk_data: Dict, recommendations: list) -> Dict:
        """Estimate expected risk reduction from recommendations."""
        current_score = risk_data.get('flood_risk_score', 0)
        
        # Estimate reduction based on recommendation types
        total_reduction = 0
        for rec in recommendations:
            if 'drainage' in rec['title'].lower():
                total_reduction += 15  # Major infrastructure has big impact
            elif 'permeable' in rec['title'].lower():
                total_reduction += 12  # Significant surface changes
            elif 'bioswales' in rec['title'].lower():
                total_reduction += 8   # Moderate drainage improvement
            elif 'vegetation' in rec['title'].lower():
                total_reduction += 5   # Some absorption benefit
        
        # Cap the reduction
        total_reduction = min(total_reduction, 40)  # Max 40% reduction
        expected_new_score = max(0, current_score - (current_score * total_reduction / 100))
        
        return {
            'expected_reduction_percentage': total_reduction,
            'current_risk_score': current_score,
            'projected_risk_score': expected_new_score,
            'confidence_level': 'Medium'
        }
    
    def _create_priority_matrix(self, recommendations: list) -> Dict:
        """Create priority matrix for recommendations."""
        matrix = {
            'high_impact_low_cost': [],
            'high_impact_high_cost': [],
            'low_impact_low_cost': [],
            'low_impact_high_cost': []
        }
        
        for rec in recommendations:
            cost = rec['estimated_cost']
            impact = rec['impact']
            
            high_cost = cost > 50000
            high_impact = impact in ['High', 'Very High']
            
            if high_impact and not high_cost:
                matrix['high_impact_low_cost'].append(rec['title'])
            elif high_impact and high_cost:
                matrix['high_impact_high_cost'].append(rec['title'])
            elif not high_impact and not high_cost:
                matrix['low_impact_low_cost'].append(rec['title'])
            else:
                matrix['low_impact_high_cost'].append(rec['title'])
        
        return matrix


def main():
    """Test the FloodMitigationRecommender."""
    recommender = FloodMitigationRecommender()
    
    # Test high-risk scenario
    test_risk_data = {
        'flood_risk_score': 75.0,
        'risk_level': 'HIGH',
        'input_parameters': {
            'asphalt_percentage': 85,
            'greenery_percentage': 8,
            'drain_percentage': 2,
            'slope_percentage': 1.2,
            'rainfall_mm': 22
        },
        'analysis': {
            'primary_concerns': [
                'High impermeable surface coverage increases runoff',
                'Insufficient slope for natural drainage',
                'Inadequate drainage infrastructure'
            ]
        }
    }
    
    recommendations = recommender.generate_recommendations(test_risk_data)
    
    print("Test Recommendations:")
    print(f"Primary recommendations: {len(recommendations['primary_recommendations'])}")
    for rec in recommendations['primary_recommendations']:
        print(f"- {rec['title']}: {rec['description']}")
    print(f"Total estimated cost: ${recommendations['cost_analysis']['total_estimated_cost']:,}")


if __name__ == "__main__":
    main()