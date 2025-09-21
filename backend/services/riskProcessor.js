const { getRiskColor } = require('../constants/colors');

class RiskProcessor {
  constructor(demService) {
    this.demService = demService;
    this.drainageCoefficient = 0.5; // Hard-coded for simple calculation
  }

  calculateRisk(rainfall, duration, elevation, slope = 0, proximityToWater = 1) {
    // Enhanced risk formula with multiple factors:
    // 1. Rainfall intensity factor: rainfall * duration
    // 2. Elevation factor: lower elevation = higher risk
    // 3. Slope factor: flatter areas hold more water
    // 4. Proximity to water: closer to bayous/streams = higher risk

    if (elevation <= 0) {
      // Very low elevation or below sea level - maximum risk
      return 1.0;
    }

    // Calculate individual risk components
    const rainfallFactor = rainfall * duration;
    const elevationFactor = Math.max(0.1, elevation + this.drainageCoefficient);
    const slopeFactor = Math.max(0.5, 2 - slope); // Lower slope = higher factor
    const proximityFactor = Math.max(0.5, 2 - proximityToWater); // Closer to water = higher factor

    // Enhanced risk formula
    const riskScore = (rainfallFactor * slopeFactor * proximityFactor) / elevationFactor;

    // Normalize to 0-1 range (will be further adjusted by percentile categorization)
    return Math.min(Math.max(riskScore, 0), 5); // Allow higher range for better distribution
  }

  // Calculate simplified slope based on elevation patterns (fast approximation)
  calculateSimplifiedSlope(elevation) {
    // Simplified slope estimation based on elevation relative to area average
    // Lower elevations in the area tend to be flatter (near water bodies)
    // Higher elevations tend to have more slope

    if (elevation < 5) return 0.5;   // Very flat near water
    if (elevation < 10) return 1.0;  // Slightly sloped
    if (elevation < 20) return 2.0;  // Moderate slope
    return 3.0; // Higher slope for elevated areas
  }

  // Calculate basic slope using adjacent elevation points (expensive - use sparingly)
  calculateSlope(longitude, latitude) {
    try {
      const offset = 0.0005; // ~50m offset for slope calculation

      // Get elevation at cardinal directions
      const elevN = this.demService.getElevationAt(longitude, latitude + offset);
      const elevS = this.demService.getElevationAt(longitude, latitude - offset);
      const elevE = this.demService.getElevationAt(longitude + offset, latitude);
      const elevW = this.demService.getElevationAt(longitude - offset, latitude);
      const elevCenter = this.demService.getElevationAt(longitude, latitude);

      if (!elevCenter || !elevN || !elevS || !elevE || !elevW) {
        return this.calculateSimplifiedSlope(elevCenter || 10); // Fallback to simplified
      }

      // Calculate gradient in both directions
      const dzdx = (elevE - elevW) / (2 * offset * 111000); // Convert to meters
      const dzdy = (elevN - elevS) / (2 * offset * 111000); // Convert to meters

      // Calculate slope as percentage
      const slope = Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100;
      return Math.min(slope, 20); // Cap at 20% slope
    } catch (error) {
      console.error('Error calculating slope:', error);
      return this.calculateSimplifiedSlope(10); // Fallback
    }
  }

  // Calculate proximity to water (simplified - using elevation as proxy)
  calculateProximityToWater(elevation) {
    // Lower elevation areas are typically closer to water bodies
    // This is a simplified approach - in reality would use water body data
    if (elevation < 5) return 0.2; // Very close to water level
    if (elevation < 10) return 0.5; // Moderately close
    if (elevation < 20) return 1.0; // Average distance
    return 1.5; // Further from water
  }

  categorizeRiskByPercentile(riskScores, riskScore) {
    // Sort all risk scores to calculate percentiles
    const sortedScores = [...riskScores].sort((a, b) => a - b);
    const n = sortedScores.length;

    // Calculate percentile position
    const position = sortedScores.findIndex(score => score >= riskScore);
    const percentile = position / n;

    // Distribute based on percentiles to ensure good spread
    if (percentile >= 0.75) { // Top 25%
      return {
        level: 'HIGH',
        color: getRiskColor('HIGH'),
        description: 'High flood risk'
      };
    } else if (percentile >= 0.25) { // Middle 50%
      return {
        level: 'MODERATE',
        color: getRiskColor('MODERATE'),
        description: 'Moderate flood risk'
      };
    } else { // Bottom 25%
      return {
        level: 'LOW',
        color: getRiskColor('LOW'),
        description: 'Low flood risk'
      };
    }
  }

  categorizeRisk(riskScore) {
    // Legacy method for backward compatibility
    if (riskScore > 0.8) {
      return {
        level: 'HIGH',
        color: getRiskColor('HIGH'),
        description: 'High flood risk'
      };
    } else if (riskScore > 0.4) {
      return {
        level: 'MODERATE',
        color: getRiskColor('MODERATE'),
        description: 'Moderate flood risk'
      };
    } else {
      return {
        level: 'LOW',
        color: getRiskColor('LOW'),
        description: 'Low flood risk'
      };
    }
  }

  async processSimulation(rainfall, duration, options = {}) {
    const startTime = Date.now();

    try {
      // Get sample points from DEM
      const numPoints = options.numPoints || 100;
      const samplePoints = this.demService.generateSampleGrid(numPoints);

      if (samplePoints.length === 0) {
        throw new Error('No valid elevation data found in DEM');
      }

      // Calculate enhanced risk for each point with simplified factors for performance
      const enhancedPoints = samplePoints.map(point => {
        // Use simplified slope calculation based on elevation patterns (faster)
        const slope = this.calculateSimplifiedSlope(point.elevation);
        const proximityToWater = this.calculateProximityToWater(point.elevation);
        const riskScore = this.calculateRisk(rainfall, duration, point.elevation, slope, proximityToWater);

        return {
          ...point,
          slope,
          proximityToWater,
          riskScore
        };
      });

      // Extract all risk scores for percentile calculation
      const allRiskScores = enhancedPoints.map(point => point.riskScore);

      // Calculate risk markers with percentile-based categorization
      const riskMarkers = enhancedPoints.map(point => {
        const riskCategory = this.categorizeRiskByPercentile(allRiskScores, point.riskScore);

        return {
          id: point.id,
          lat: point.latitude,
          lng: point.longitude,
          elevation: point.elevation,
          slope: Math.round(point.slope * 100) / 100, // Round to 2 decimal places
          proximityToWater: Math.round(point.proximityToWater * 100) / 100,
          riskScore: Math.round(point.riskScore * 1000) / 1000, // Round to 3 decimal places
          riskLevel: riskCategory.level,
          riskColor: riskCategory.color,
          riskDescription: riskCategory.description
        };
      });

      // Apply spatial clustering to reduce marker density
      const clusteredMarkers = this.applySpatialClustering(riskMarkers, options.minDistance || 0.001);

      const processingTime = Date.now() - startTime;

      return {
        riskMarkers: clusteredMarkers,
        processingTime,
        parameters: { rainfall, duration },
        statistics: this.calculateStatistics(clusteredMarkers),
        demInfo: {
          totalPoints: samplePoints.length,
          clusteredPoints: clusteredMarkers.length,
          coverage: 'Fifth Ward Houston'
        }
      };

    } catch (error) {
      console.error('Error processing simulation:', error);
      throw new Error(`Simulation processing failed: ${error.message}`);
    }
  }

  applySpatialClustering(markers, minDistance) {
    // Simple spatial clustering to prevent marker overlap
    // Remove markers that are too close to higher-risk markers

    const clustered = [];
    const processed = new Set();

    // Sort by risk score (highest first) to prioritize high-risk areas
    const sortedMarkers = [...markers].sort((a, b) => b.riskScore - a.riskScore);

    for (const marker of sortedMarkers) {
      if (processed.has(marker.id)) continue;

      let keepMarker = true;

      // Check distance to already selected markers
      for (const selected of clustered) {
        const distance = this.calculateDistance(
          marker.lat, marker.lng,
          selected.lat, selected.lng
        );

        if (distance < minDistance) {
          keepMarker = false;
          break;
        }
      }

      if (keepMarker) {
        clustered.push(marker);
      }

      processed.add(marker.id);
    }

    return clustered;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  calculateStatistics(markers) {
    if (markers.length === 0) {
      return { high: 0, moderate: 0, low: 0, total: 0 };
    }

    const stats = markers.reduce((acc, marker) => {
      acc[marker.riskLevel.toLowerCase()]++;
      acc.total++;
      return acc;
    }, { high: 0, moderate: 0, low: 0, total: 0 });

    return {
      ...stats,
      highPercentage: Math.round((stats.high / stats.total) * 100),
      moderatePercentage: Math.round((stats.moderate / stats.total) * 100),
      lowPercentage: Math.round((stats.low / stats.total) * 100)
    };
  }
}

module.exports = RiskProcessor;