"""
Flood Risk Mitigation Recommender
Provides actionable recommendations based on flood risk analysis.
Includes detailed intervention planning with construction time, community impact, and flood reduction estimates.
"""

from typing import Dict, List, Tuple
import math


class FloodMitigationRecommender:
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize the recommender with rule-based logic."""
        self.config_path = config_path
    
    def generate_recommendations(self, risk_data: Dict, road_type: str = 'residential street') -> Dict:
        """
        Generate flood mitigation recommendations based on flood risk analysis.
        
        Args:
            risk_data: Complete flood risk analysis dictionary
            road_type: Type of road/location context for impact assessment
            
        Returns:
            Dictionary with comprehensive recommendations including interventions
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
        
        # Generate interventions based on conditions
        interventions = self._generate_interventions(
            asphalt_pct, greenery_pct, slope_pct, drains_pct, road_type
        )
        
        # Calculate total costs and duration
        total_cost = self._calculate_total_costs(interventions)
        total_duration = self._calculate_total_duration(interventions, road_type)
        total_flood_reduction = self._calculate_total_flood_reduction(interventions)
        
        # Generate community impact summary
        community_summary = self._generate_community_summary(interventions, total_flood_reduction, road_type)
        
        # Maintain backward compatibility with legacy fields
        legacy_recommendations = self._generate_legacy_recommendations(interventions)
        
        result = {
            # New intervention-based structure
            'interventions': interventions,
            'total_cost': total_cost,
            'total_duration': total_duration,
            'total_flood_reduction_pct': total_flood_reduction,
            'community_summary': community_summary,
            
            # Legacy structure for backward compatibility
            'primary_recommendations': legacy_recommendations,
            'secondary_recommendations': [],
            'implementation_plan': self._create_implementation_plan_from_interventions(interventions),
            'cost_analysis': {
                'total_estimated_cost': total_cost['mid'],
                'primary_recommendations_cost': total_cost['mid'],
                'secondary_recommendations_cost': 0
            },
            'expected_risk_reduction': {
                'expected_reduction_percentage': total_flood_reduction,
                'current_risk_score': risk_score,
                'projected_risk_score': max(0, risk_score - (risk_score * total_flood_reduction / 100)),
                'confidence_level': 'High'
            },
            'risk_context': {
                'current_risk_level': risk_level,
                'risk_score': risk_score,
                'road_type': road_type
            }
        }
        
        print(f"💡 Generated {len(interventions)} interventions for {road_type} (Risk: {risk_level})")
        return result
    
    def _generate_interventions(self, asphalt_pct: float, greenery_pct: float, 
                               slope_pct: float, drains_pct: float, road_type: str) -> List[Dict]:
        """Generate specific interventions based on terrain conditions."""
        interventions = []
        base_area = 1000  # Assume 1000 sq ft per 100m road segment
        
        # Permeable Pavement Retrofit (when asphalt % > 40%)
        if asphalt_pct > 40:
            area_sqft = min(base_area * (asphalt_pct / 100), base_area * 0.8)  # Cap at 80% replacement
            cost_low, cost_mid, cost_high = self._calculate_intervention_cost('permeable_pavement', area_sqft)
            construction_time = self._calculate_construction_time('permeable_pavement', area_sqft, road_type)
            impact_desc, impact_severity = self._calculate_community_impact('permeable_pavement', road_type)
            flood_reduction = self._calculate_flood_reduction('permeable_pavement', area_sqft, asphalt_pct)
            
            interventions.append({
                'type': 'permeable_pavement',
                'qty_sqft': int(area_sqft),
                'cost_low': cost_low,
                'cost_mid': cost_mid,
                'cost_high': cost_high,
                'construction_time': construction_time,
                'impact_description': impact_desc,
                'impact_severity': impact_severity,
                'flood_reduction_pct': flood_reduction
            })
        
        # Bioswales / Green Drainage (when slope < 1.5% or greenery < 20%)
        if slope_pct < 1.5 or greenery_pct < 20:
            length_ft = max(100, 200 - (greenery_pct * 5))  # More length needed if less greenery
            cost_low, cost_mid, cost_high = self._calculate_intervention_cost('bioswales', length_ft)
            construction_time = self._calculate_construction_time('bioswales', length_ft, road_type)
            impact_desc, impact_severity = self._calculate_community_impact('bioswales', road_type)
            flood_reduction = self._calculate_flood_reduction('bioswales', length_ft, greenery_pct)
            
            interventions.append({
                'type': 'bioswales',
                'qty_ft': int(length_ft),
                'cost_low': cost_low,
                'cost_mid': cost_mid,
                'cost_high': cost_high,
                'construction_time': construction_time,
                'impact_description': impact_desc,
                'impact_severity': impact_severity,
                'flood_reduction_pct': flood_reduction
            })
        
        # Tree Planting (when greenery % < 25%)
        if greenery_pct < 25:
            num_trees = max(5, int((25 - greenery_pct) * 2))  # 2 trees per percentage point deficit
            cost_low, cost_mid, cost_high = self._calculate_intervention_cost('tree_planting', num_trees)
            construction_time = self._calculate_construction_time('tree_planting', num_trees, road_type)
            impact_desc, impact_severity = self._calculate_community_impact('tree_planting', road_type)
            flood_reduction = self._calculate_flood_reduction('tree_planting', num_trees, greenery_pct)
            
            interventions.append({
                'type': 'tree_planting',
                'qty_trees': num_trees,
                'cost_low': cost_low,
                'cost_mid': cost_mid,
                'cost_high': cost_high,
                'construction_time': construction_time,
                'impact_description': impact_desc,
                'impact_severity': impact_severity,
                'flood_reduction_pct': flood_reduction
            })
        
        # Drainage Inlet / Culvert Upgrade (when slope is flat and asphalt % is high)
        if slope_pct < 2.0 and asphalt_pct > 50:
            num_inlets = max(2, int(asphalt_pct / 25))  # More inlets for higher asphalt coverage
            cost_low, cost_mid, cost_high = self._calculate_intervention_cost('drainage_upgrade', num_inlets)
            construction_time = self._calculate_construction_time('drainage_upgrade', num_inlets, road_type)
            impact_desc, impact_severity = self._calculate_community_impact('drainage_upgrade', road_type)
            flood_reduction = self._calculate_flood_reduction('drainage_upgrade', num_inlets, asphalt_pct)
            
            interventions.append({
                'type': 'drainage_upgrade',
                'qty_inlets': num_inlets,
                'cost_low': cost_low,
                'cost_mid': cost_mid,
                'cost_high': cost_high,
                'construction_time': construction_time,
                'impact_description': impact_desc,
                'impact_severity': impact_severity,
                'flood_reduction_pct': flood_reduction
            })
        
        # Pothole / Road Repair (basic maintenance when other measures are minimal)
        if len(interventions) < 2:  # Add maintenance if few other interventions
            area_sqft = 200  # Basic repair area
            cost_low, cost_mid, cost_high = self._calculate_intervention_cost('road_repair', area_sqft)
            construction_time = self._calculate_construction_time('road_repair', area_sqft, road_type)
            impact_desc, impact_severity = self._calculate_community_impact('road_repair', road_type)
            flood_reduction = self._calculate_flood_reduction('road_repair', area_sqft, asphalt_pct)
            
            interventions.append({
                'type': 'road_repair',
                'qty_sqft': int(area_sqft),
                'cost_low': cost_low,
                'cost_mid': cost_mid,
                'cost_high': cost_high,
                'construction_time': construction_time,
                'impact_description': impact_desc,
                'impact_severity': impact_severity,
                'flood_reduction_pct': flood_reduction
            })
        
        return interventions
    
    def _calculate_intervention_cost(self, intervention_type: str, quantity: float) -> Tuple[int, int, int]:
        """Calculate low, mid, high cost estimates for interventions."""
        cost_per_unit = {
            'permeable_pavement': (120, 200, 320),  # Per sq ft
            'bioswales': (150, 250, 400),  # Per linear ft
            'tree_planting': (300, 500, 800),  # Per tree
            'drainage_upgrade': (3000, 5000, 8000),  # Per inlet/culvert
            'road_repair': (50, 80, 130)  # Per sq ft
        }
        
        low_rate, mid_rate, high_rate = cost_per_unit.get(intervention_type, (100, 150, 250))
        
        return (
            int(quantity * low_rate),
            int(quantity * mid_rate), 
            int(quantity * high_rate)
        )
    
    def _calculate_construction_time(self, intervention_type: str, quantity: float, road_type: str) -> str:
        """Calculate construction time based on intervention type, scale, and road type."""
        base_times = {
            'permeable_pavement': (7, 14),  # 1-2 weeks for 1000 sq ft
            'bioswales': (5, 7),  # 1 week for 100 ft
            'tree_planting': (2, 3),  # 2-3 days per 10 trees (normalized from fractional)
            'drainage_upgrade': (10, 20),  # 2-4 weeks per inlet
            'road_repair': (2, 4)  # 2-4 days for 100 sq ft (normalized from 1-2)
        }
        
        min_days, max_days = base_times.get(intervention_type, (5, 10))
        
        # Scale based on quantity
        if intervention_type == 'permeable_pavement':
            scale_factor = quantity / 1000
        elif intervention_type == 'bioswales':
            scale_factor = quantity / 100
        elif intervention_type == 'tree_planting':
            scale_factor = quantity / 10
        elif intervention_type == 'drainage_upgrade':
            scale_factor = quantity
        else:  # road_repair
            scale_factor = quantity / 100
        
        scaled_min = max(1, int(min_days * scale_factor))
        scaled_max = max(scaled_min + 1, int(max_days * scale_factor))
        
        # Road type complexity modifier
        if road_type in ['interstate section', 'highway lane']:
            scaled_min = int(scaled_min * 1.5)
            scaled_max = int(scaled_max * 1.5)
        
        # Standardize to weeks for consistency
        # Convert days to weeks with proper rounding
        if scaled_max <= 7:
            # Keep in days only if 1 week or less
            return f"{scaled_min}-{scaled_max} days"
        elif scaled_max <= 56:  # Up to 8 weeks
            weeks_min = max(1, (scaled_min + 6) // 7)  # Round up
            weeks_max = max(weeks_min, (scaled_max + 6) // 7)  # Round up
            return f"{weeks_min}-{weeks_max} weeks"
        else:
            months_min = max(1, (scaled_min + 29) // 30)  # Round up
            months_max = max(months_min, (scaled_max + 29) // 30)  # Round up
            return f"{months_min}-{months_max} months"
    
    def _calculate_community_impact(self, intervention_type: str, road_type: str) -> Tuple[str, str]:
        """Calculate community impact description and severity with detailed road type context."""
        # Enhanced impact templates with realistic consequences by road type
        impact_templates = {
            'residential street': {
                'base': "Local resident access and minor detours around construction",
                'severity': 'LOW'
            },
            'highway lane': {
                'base': "Slight congestion during peak hours with potential lane restrictions",
                'severity': 'MEDIUM'
            },
            'interstate section': {
                'base': "Severe regional traffic disruption with major delays and alternate routes",
                'severity': 'HIGH'
            },
            'sidewalk': {
                'base': "Temporary pedestrian rerouting with minimal vehicle impact",
                'severity': 'LOW'
            },
            'parking lot': {
                'base': "Business disruption with limited parking availability",
                'severity': 'LOW'
            }
        }
        
        template = impact_templates.get(road_type, impact_templates['residential street'])
        description = template['base']
        severity = template['severity']
        
        # Modify based on intervention complexity and road type interactions
        if intervention_type == 'drainage_upgrade':
            # Drainage upgrades are more disruptive
            if road_type == 'parking lot':
                description = "Extended business disruption with significant parking limitations and utility work"
                severity = 'MEDIUM'
            elif road_type == 'residential street':
                description = "Moderate disruption to local residents with utility access restrictions"
                severity = 'MEDIUM'
            elif road_type == 'highway lane':
                description = "Major lane closures during peak hours with substantial congestion"
                severity = 'HIGH'
            elif road_type == 'interstate section':
                description = "Critical regional disruption requiring extensive detour planning"
                severity = 'HIGH'
                
        elif intervention_type == 'permeable_pavement':
            # Pavement work requires significant surface access
            if road_type == 'parking lot':
                description = "Business access limitations during pavement replacement"
            elif road_type == 'residential street':
                description = "Construction delays with periodic lane closures affecting local traffic"
            elif road_type == 'highway lane':
                description = "Significant traffic delays with extended lane restrictions"
            elif road_type == 'interstate section':
                description = "Major regional disruption requiring coordinated traffic management"
                
        elif intervention_type == 'bioswales':
            # Bioswales typically require roadside work
            if road_type == 'parking lot':
                description = "Minor parking area modifications with temporary access changes"
            elif road_type == 'residential street':
                description = "Roadside construction with minimal traffic interruption"
            elif road_type == 'highway lane':
                description = "Shoulder work with possible lane restrictions during construction"
                
        elif intervention_type == 'tree_planting':
            # Tree planting is generally less disruptive
            if road_type == 'parking lot':
                description = "Limited parking modifications for landscape installation"
            elif road_type == 'residential street':
                description = "Minimal disruption during roadside tree installation"
            elif road_type == 'highway lane':
                description = "Brief shoulder closures for roadside vegetation establishment"
                
        elif intervention_type == 'road_repair':
            # Road repair impacts vary significantly by road type
            if road_type == 'parking lot':
                description = "Sectional parking closures during surface repairs"
            elif road_type == 'residential street':
                description = "Temporary traffic control during localized road maintenance"
            elif road_type == 'highway lane':
                description = "Lane restrictions and traffic delays during roadway repairs"
            elif road_type == 'interstate section':
                description = "Coordinated lane closures with potential speed restrictions"
        
        return description, severity
    
    def _calculate_flood_reduction(self, intervention_type: str, quantity: float, context_pct: float) -> int:
        """Calculate flood reduction percentage for intervention."""
        base_reductions = {
            'permeable_pavement': (20, 40),  # 20-40% based on coverage
            'bioswales': (10, 25),  # 10-25% based on length
            'drainage_upgrade': (30, 50),  # 30-50% based on number of inlets
            'tree_planting': (5, 15),  # 5-15% based on number of trees
            'road_repair': (30, 50)  # 30-50% localized reduction
        }
        
        min_reduction, max_reduction = base_reductions.get(intervention_type, (5, 15))
        
        # Scale based on intervention scope
        if intervention_type == 'permeable_pavement':
            scale = min(1.0, quantity / 800)  # 800 sq ft as reference
            reduction = min_reduction + (max_reduction - min_reduction) * scale
        elif intervention_type == 'bioswales':
            scale = min(1.0, quantity / 150)  # 150 ft as reference
            reduction = min_reduction + (max_reduction - min_reduction) * scale
        elif intervention_type == 'tree_planting':
            scale = min(1.0, quantity / 20)  # 20 trees as reference
            reduction = min_reduction + (max_reduction - min_reduction) * scale
        elif intervention_type == 'drainage_upgrade':
            scale = min(1.0, quantity / 3)  # 3 inlets as reference
            reduction = min_reduction + (max_reduction - min_reduction) * scale
        else:  # road_repair
            reduction = min_reduction  # Conservative estimate
        
        return int(reduction)
    
    def _calculate_total_costs(self, interventions: List[Dict]) -> Dict[str, int]:
        """Calculate total costs across all interventions."""
        total_low = sum(intervention['cost_low'] for intervention in interventions)
        total_mid = sum(intervention['cost_mid'] for intervention in interventions)
        total_high = sum(intervention['cost_high'] for intervention in interventions)
        
        return {
            'low': total_low,
            'mid': total_mid,
            'high': total_high
        }
    
    def _calculate_total_duration(self, interventions: List[Dict], road_type: str) -> str:
        """Calculate total construction duration considering parallelization."""
        if not interventions:
            return "No construction needed"
        
        # Some interventions can be done in parallel, others are sequential
        parallel_interventions = ['tree_planting', 'road_repair']
        sequential_interventions = ['permeable_pavement', 'bioswales', 'drainage_upgrade']
        
        parallel_max_days = 0
        sequential_total_days = 0
        
        for intervention in interventions:
            time_str = intervention['construction_time']
            days = self._parse_time_to_days(time_str)
            
            if intervention['type'] in parallel_interventions:
                parallel_max_days = max(parallel_max_days, days)
            else:
                sequential_total_days += days
        
        total_days = sequential_total_days + parallel_max_days
        
        # Convert back to readable format with consistent units
        if total_days <= 7:
            return f"{total_days} days"
        elif total_days <= 56:  # Up to 8 weeks
            weeks = (total_days + 6) // 7  # Round up to weeks
            return f"{weeks} weeks"
        else:
            months = (total_days + 29) // 30  # Round up to months
            return f"{months} months"
    
    def _parse_time_to_days(self, time_str: str) -> int:
        """Parse time string to days for calculation."""
        time_str = time_str.lower()
        if 'day' in time_str:
            # Extract number from "X-Y days" format
            numbers = [int(s) for s in time_str.split() if s.isdigit()]
            return max(numbers) if numbers else 7
        elif 'week' in time_str:
            numbers = [int(s) for s in time_str.split() if s.isdigit()]
            return (max(numbers) if numbers else 2) * 7
        elif 'month' in time_str:
            numbers = [int(s) for s in time_str.split() if s.isdigit()]
            return (max(numbers) if numbers else 2) * 30
        else:
            return 7  # Default to 1 week
    
    def _calculate_total_flood_reduction(self, interventions: List[Dict]) -> int:
        """Calculate total flood reduction using multiplicative formula, capped at ~80%."""
        if not interventions:
            return 0
        
        # Use multiplicative formula: total_reduction = 1 - (1 - r1) * (1 - r2) * ...
        # This avoids exceeding realistic limits and provides diminishing returns
        combined_retention = 1.0  # Start with 100% of original risk
        
        for intervention in interventions:
            reduction_pct = intervention['flood_reduction_pct']
            reduction_fraction = reduction_pct / 100.0
            # Multiply by remaining risk fraction after this intervention
            combined_retention *= (1.0 - reduction_fraction)
        
        # Total reduction is 1 minus the combined retention
        total_reduction = (1.0 - combined_retention) * 100.0
        
        # Cap at 80% maximum reduction for realism
        return min(80, int(total_reduction))
    
    def _generate_community_summary(self, interventions: List[Dict], total_flood_reduction: int, road_type: str) -> str:
        """Generate community impact summary with scaled severity for multiple interventions."""
        if not interventions:
            return "No interventions needed."
        
        # Count interventions by severity level
        severities = [intervention['impact_severity'] for intervention in interventions]
        severity_counts = {
            'LOW': severities.count('LOW'),
            'MEDIUM': severities.count('MEDIUM'),
            'HIGH': severities.count('HIGH')
        }
        
        # Determine overall impact severity with scaling logic
        if severity_counts['HIGH'] > 0:
            overall_severity = 'HIGH'  # Any HIGH caps at HIGH
        elif severity_counts['MEDIUM'] > 0:
            overall_severity = 'MEDIUM'
        elif severity_counts['LOW'] >= 2:
            # Multiple LOW interventions in same area scale to MEDIUM
            overall_severity = 'MEDIUM'
        else:
            overall_severity = 'LOW'
        
        # Create summary based on road type and severity
        if road_type == 'interstate section':
            if overall_severity == 'HIGH':
                impact_desc = "Major regional disruption with significant commuter delays"
            elif overall_severity == 'MEDIUM':
                impact_desc = "Moderate traffic disruption during construction"
            else:
                impact_desc = "Minor traffic impact during construction"
        elif road_type == 'highway lane':
            if overall_severity == 'HIGH':
                impact_desc = "Significant traffic delays and congestion"
            elif overall_severity == 'MEDIUM':
                impact_desc = "Some congestion during peak hours"
            else:
                impact_desc = "Minimal traffic impact"
        else:  # residential, sidewalk, parking lot
            if overall_severity == 'HIGH':
                impact_desc = "Extended local disruption"
            elif overall_severity == 'MEDIUM':
                impact_desc = "Moderate temporary disruption"
            else:
                impact_desc = "Minor temporary delays"
        
        return f"{impact_desc}, but runoff decreases ~{total_flood_reduction}% post-construction."
    
    def _generate_legacy_recommendations(self, interventions: List[Dict]) -> List[Dict]:
        """Convert interventions to legacy recommendation format for backward compatibility."""
        legacy_recs = []
        
        for intervention in interventions:
            title = self._intervention_to_title(intervention['type'])
            description = self._intervention_to_description(intervention)
            
            legacy_recs.append({
                'title': title,
                'description': description,
                'priority': self._severity_to_priority(intervention['impact_severity']),
                'estimated_cost': intervention['cost_mid'],
                'impact': intervention['impact_severity'].title(),
                'timeframe': intervention['construction_time']
            })
        
        return legacy_recs
    
    def _intervention_to_title(self, intervention_type: str) -> str:
        """Convert intervention type to readable title."""
        titles = {
            'permeable_pavement': 'Install Permeable Pavement',
            'bioswales': 'Create Bioswales and Green Infrastructure',
            'tree_planting': 'Increase Vegetation Coverage',
            'drainage_upgrade': 'Improve Drainage Infrastructure',
            'road_repair': 'Road Repair and Maintenance'
        }
        return titles.get(intervention_type, 'Infrastructure Improvement')
    
    def _intervention_to_description(self, intervention: Dict) -> str:
        """Generate description for intervention."""
        intervention_type = intervention['type']
        
        if intervention_type == 'permeable_pavement':
            return f"Replace {intervention['qty_sqft']} sq ft of impermeable surface with permeable alternatives"
        elif intervention_type == 'bioswales':
            return f"Install {intervention['qty_ft']} linear feet of vegetated drainage channels"
        elif intervention_type == 'tree_planting':
            return f"Plant {intervention['qty_trees']} trees to improve water absorption and reduce runoff"
        elif intervention_type == 'drainage_upgrade':
            return f"Install {intervention['qty_inlets']} drainage inlets and upgrade storm water systems"
        elif intervention_type == 'road_repair':
            return f"Repair {intervention['qty_sqft']} sq ft of road surface to improve drainage"
        else:
            return "Infrastructure improvement to reduce flood risk"
    
    def _severity_to_priority(self, severity: str) -> str:
        """Convert impact severity to priority level."""
        mapping = {
            'LOW': 'Medium',
            'MEDIUM': 'High',
            'HIGH': 'Critical'
        }
        return mapping.get(severity, 'Medium')
    
    def _create_implementation_plan_from_interventions(self, interventions: List[Dict]) -> Dict:
        """Create implementation plan from interventions."""
        if not interventions:
            return {
                'phase_1_immediate': {'timeframe': '0-3 months', 'actions': []},
                'phase_2_short_term': {'timeframe': '3-12 months', 'actions': []},
                'phase_3_long_term': {'timeframe': '12+ months', 'actions': []}
            }
        
        # Sort by impact severity and cost
        critical = [i for i in interventions if i['impact_severity'] == 'HIGH']
        high = [i for i in interventions if i['impact_severity'] == 'MEDIUM']
        medium = [i for i in interventions if i['impact_severity'] == 'LOW']
        
        return {
            'phase_1_immediate': {
                'timeframe': '0-3 months',
                'actions': [self._intervention_to_title(i['type']) for i in critical[:2]]
            },
            'phase_2_short_term': {
                'timeframe': '3-12 months', 
                'actions': [self._intervention_to_title(i['type']) for i in critical[2:] + high]
            },
            'phase_3_long_term': {
                'timeframe': '12+ months',
                'actions': [self._intervention_to_title(i['type']) for i in medium]
            }
        }
    
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