class RiskProcessor {
  constructor(demService) {
    this.demService = demService;
    this.drainageCoefficient = 0.5; // Hard-coded for simple calculation
  }

  calculateRisk(rainfall, duration, elevation) {
    // Basic risk formula: (rainfall * duration) / (elevation + drainage)
    // Higher rainfall/duration = higher risk
    // Higher elevation = lower risk
    // Drainage coefficient accounts for soil permeability/infrastructure

    if (elevation <= 0) {
      // Very low elevation or below sea level - high risk
      return 1.0;
    }

    const riskScore = (rainfall * duration) / (elevation + this.drainageCoefficient);

    // Clamp risk score between 0 and 1
    return Math.min(Math.max(riskScore, 0), 1);
  }

  categorizeRisk(riskScore) {
    if (riskScore > 0.8) {
      return {
        level: 'HIGH',
        color: '#dc2626', // Red
        description: 'High flood risk'
      };
    } else if (riskScore > 0.4) {
      return {
        level: 'MODERATE',
        color: '#f59e0b', // Yellow/Orange
        description: 'Moderate flood risk'
      };
    } else {
      return {
        level: 'LOW',
        color: '#16a34a', // Green
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

      // Calculate risk for each point
      const riskMarkers = samplePoints.map(point => {
        const riskScore = this.calculateRisk(rainfall, duration, point.elevation);
        const riskCategory = this.categorizeRisk(riskScore);

        return {
          id: point.id,
          lat: point.latitude,
          lng: point.longitude,
          elevation: point.elevation,
          riskScore: Math.round(riskScore * 1000) / 1000, // Round to 3 decimal places
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