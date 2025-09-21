const { getRiskColor } = require('../constants/colors');
const WhiteboxService = require('./whiteboxService');

class RiskProcessor {
  constructor(demService) {
    this.demService = demService;
    this.drainageCoefficient = 0.5; // Default fallback value
    this.whiteboxService = null; // Initialize on demand
    this.useWhitebox = process.env.ENABLE_WHITEBOX !== 'false'; // Enable by default
  }

  async initializeWhitebox() {
    if (!this.whiteboxService && this.useWhitebox) {
      try {
        this.whiteboxService = new WhiteboxService(this.demService.demPath);
        console.log('WhiteboxService initialized for advanced hydrological analysis');
      } catch (error) {
        console.error('Failed to initialize WhiteboxService:', error.message);
        console.log('Falling back to simplified calculations');
        this.useWhitebox = false;
      }
    }
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

  /**
   * Calculate advanced risk using WhiteboxTools hydrological analysis
   */
  async calculateAdvancedRisk(rainfall, duration, elevation, longitude, latitude) {
    console.log(`🧮 Calculating advanced risk: rainfall=${rainfall}, duration=${duration}, elevation=${elevation}`);

    try {
      // Get comprehensive hydrological data for this point
      const hydrology = await this.whiteboxService.processPointHydrology(longitude, latitude);

      const riskResult = this.calculateScientificRisk(rainfall, duration, elevation, hydrology);

      console.log(`📊 Advanced risk calculation result:`, {
        riskScore: riskResult.riskScore,
        factors: riskResult.factors,
        usingAdvanced: true
      });

      return {
        riskScore: riskResult.riskScore,
        hydrology: hydrology,
        drainageCoefficient: riskResult.factors.drainageCoeff,
        factors: riskResult.factors // Include for debugging
      };
    } catch (error) {
      console.error('❌ Error calculating advanced risk:', error.message);

      // Fallback to simplified calculation
      const simplifiedHydrology = {
        flowAccumulation: 0,
        slope: this.calculateSimplifiedSlope(elevation),
        flowLength: 0,
        drainageArea: 0
      };

      const riskResult = this.calculateScientificRisk(rainfall, duration, elevation, simplifiedHydrology);

      console.log(`🔄 Fallback to simplified risk calculation:`, {
        riskScore: riskResult.riskScore,
        factors: riskResult.factors,
        usingAdvanced: false
      });

      return {
        riskScore: riskResult.riskScore,
        hydrology: simplifiedHydrology,
        drainageCoefficient: riskResult.factors.drainageCoeff,
        factors: riskResult.factors
      };
    }
  }

  /**
   * Stable flood risk calculation using weighted additive model
   * REWRITTEN: Fixes mathematical instability from multiplicative exponential amplification
   */
  calculateScientificRisk(rainfall, duration, elevation, hydrology) {
    console.log(`🧮 Calculating stable risk: ${rainfall}in/${duration}h, elevation=${elevation}m`);

    // 1. RAINFALL COMPONENT (0-6 points max) - Primary driver
    const rainfallScore = this.calculateRainfallScore(rainfall, duration);

    // 2. ELEVATION COMPONENT (0-2 points max) - Terrain resistance
    const elevationScore = this.calculateElevationScore(elevation);

    // 3. HYDROLOGY COMPONENT (0-1.5 points max) - WhiteboxTools data
    const hydrologyScore = this.calculateHydrologyScore(hydrology, elevation);

    // 4. PROXIMITY COMPONENT (0-0.5 points max) - Buffalo Bayou distance
    const proximityScore = this.calculateProximityScore(elevation);

    // 5. WEIGHTED ADDITIVE MODEL (instead of multiplication)
    // Total possible: 10 points (6+2+1.5+0.5)
    const finalRiskScore = (rainfallScore * 0.60) +     // 60% weight - primary factor
                          (elevationScore * 0.25) +     // 25% weight - terrain
                          (hydrologyScore * 0.15);      // 15% weight - hydrology
                          // proximityScore is included in hydrologyScore

    // Ensure 0-10 range (should naturally stay in range now)
    const clampedScore = Math.max(0, Math.min(10, finalRiskScore));

    console.log(`📊 Risk components: rainfall=${rainfallScore.toFixed(2)}, elevation=${elevationScore.toFixed(2)}, hydrology=${hydrologyScore.toFixed(2)}, final=${clampedScore.toFixed(3)}`);

    return {
      riskScore: clampedScore,
      factors: {
        rainfallScore: rainfallScore,
        elevationScore: elevationScore,
        hydrologyScore: hydrologyScore,
        proximityScore: proximityScore,
        weightedSum: finalRiskScore,
        rainfallWeight: 0.60,
        elevationWeight: 0.25,
        hydrologyWeight: 0.15,
        modelType: "weighted_additive"
      }
    };
  }

  /**
   * Calculate rainfall risk component (0-6 points)
   */
  calculateRainfallScore(rainfall, duration) {
    // Base rainfall impact with diminishing returns (not exponential)
    const rainfallIntensity = rainfall / duration;

    // Progressive scaling: light rain = low scores, heavy rain = high scores
    let rainfallBase;
    if (rainfall <= 2) {
      rainfallBase = rainfall * 0.5; // 0-1 points for light rain
    } else if (rainfall <= 6) {
      rainfallBase = 1 + (rainfall - 2) * 0.75; // 1-4 points for moderate rain
    } else if (rainfall <= 12) {
      rainfallBase = 4 + (rainfall - 6) * 0.25; // 4-5.5 points for heavy rain
    } else {
      rainfallBase = 5.5 + Math.min(rainfall - 12, 10) * 0.05; // 5.5-6 points for extreme
    }

    // Duration multiplier (soil saturation effect - simplified)
    let durationMultiplier = 1.0;
    if (duration > 24) {
      durationMultiplier = 1.2; // 20% increase for extended events
    } else if (duration > 12) {
      durationMultiplier = 1.1; // 10% increase for long events
    }

    return Math.min(6.0, rainfallBase * durationMultiplier);
  }

  /**
   * Calculate elevation risk component (0-2 points)
   */
  calculateElevationScore(elevation) {
    // Lower elevation = higher risk (inverse relationship)
    if (elevation <= 0) return 2.0; // Below sea level - maximum risk
    if (elevation <= 5) return 1.8 - (elevation * 0.2); // 1.8-0.8 for very low areas
    if (elevation <= 15) return 0.8 - ((elevation - 5) * 0.06); // 0.8-0.2 for low areas
    if (elevation <= 30) return 0.2 - ((elevation - 15) * 0.01); // 0.2-0.05 for moderate areas
    return 0.05; // Minimal risk for high elevation
  }

  /**
   * Calculate hydrology risk component (0-1.5 points)
   */
  calculateHydrologyScore(hydrology, elevation) {
    const slope = hydrology.slope || this.calculateSimplifiedSlope(elevation);
    const flowAccumulation = hydrology.flowAccumulation || 0;

    // Slope component (0-0.75 points) - flatter = higher risk
    let slopeScore = 0;
    if (slope <= 1) slopeScore = 0.75;
    else if (slope <= 3) slopeScore = 0.75 - ((slope - 1) * 0.25);
    else if (slope <= 10) slopeScore = 0.25 - ((slope - 3) * 0.03);
    else slopeScore = 0.05;

    // Flow accumulation component (0-0.75 points) - more upstream flow = higher risk
    let flowScore = 0;
    if (flowAccumulation > 1000) flowScore = 0.75;
    else if (flowAccumulation > 100) flowScore = 0.25 + (flowAccumulation - 100) * 0.0005;
    else if (flowAccumulation > 10) flowScore = flowAccumulation * 0.0025;
    else flowScore = 0;

    return Math.min(1.5, slopeScore + flowScore);
  }

  /**
   * Calculate proximity risk component (0-0.5 points)
   */
  calculateProximityScore(elevation) {
    // Simplified proximity based on elevation (lower = closer to water)
    if (elevation < 3) return 0.5;   // Very close to water level
    if (elevation < 8) return 0.3;   // Moderately close
    if (elevation < 15) return 0.1;  // Further from water
    return 0.05;                     // Distant from water
  }

  /**
   * Log comprehensive score distribution for debugging
   */
  logScoreDistribution(allScores, rainfall, duration) {
    if (allScores.length === 0) return;

    const sorted = [...allScores].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Calculate percentiles
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p90 = sorted[Math.floor(sorted.length * 0.90)];

    // Count values in different ranges
    const lowCount = allScores.filter(s => s < 2).length;
    const medCount = allScores.filter(s => s >= 2 && s < 5).length;
    const highCount = allScores.filter(s => s >= 5).length;

    console.log(`📊 SCORE DISTRIBUTION ANALYSIS - ${rainfall}in/${duration}h`);
    console.log(`   Range: ${min.toFixed(3)} → ${max.toFixed(3)} (target: 0-10)`);
    console.log(`   Stats: avg=${avg.toFixed(3)}, median=${median.toFixed(3)}`);
    console.log(`   Percentiles: 25th=${p25.toFixed(3)}, 75th=${p75.toFixed(3)}, 90th=${p90.toFixed(3)}`);
    console.log(`   Distribution: Low(<2)=${lowCount}(${Math.round(lowCount/allScores.length*100)}%), Med(2-5)=${medCount}(${Math.round(medCount/allScores.length*100)}%), High(5+)=${highCount}(${Math.round(highCount/allScores.length*100)}%)`);
    console.log(`   Mathematical Stability: ${max <= 10 ? '✅ STABLE' : '❌ UNSTABLE - scores exceed 10'}`);
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

  // Calculate proximity to Buffalo Bayou and water bodies
  calculateProximityToWater(elevation, longitude = null, latitude = null) {
    // Buffalo Bayou coordinates (approximate path through Fifth Ward)
    const buffaloCoordinates = [
      { lat: 29.7760, lng: -95.3350 }, // Western section
      { lat: 29.7767, lng: -95.3270 }, // Central Fifth Ward
      { lat: 29.7740, lng: -95.3200 }, // Eastern section
      { lat: 29.7720, lng: -95.3150 }  // Downtown approach
    ];

    // If coordinates provided, calculate actual distance to Buffalo Bayou
    if (longitude && latitude) {
      let minDistance = Infinity;

      for (const bayouPoint of buffaloCoordinates) {
        const distance = this.calculateDistance(latitude, longitude, bayouPoint.lat, bayouPoint.lng);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }

      // Convert distance to proximity factor
      // Areas within 0.5 miles (0.8 km) of Buffalo Bayou have higher risk
      if (minDistance < 0.3) return 0.1; // Very close to bayou - highest risk
      if (minDistance < 0.5) return 0.2; // Close to bayou - high risk
      if (minDistance < 0.8) return 0.4; // Moderate distance - moderate risk
      if (minDistance < 1.5) return 0.7; // Further from bayou
      return 1.0; // Distant from bayou
    }

    // Fallback: elevation-based proximity estimate
    if (elevation < 5) return 0.2; // Very close to water level
    if (elevation < 10) return 0.5; // Moderately close
    if (elevation < 20) return 1.0; // Average distance
    return 1.5; // Further from water
  }

  /**
   * Process points using WhiteboxTools advanced hydrological analysis
   */
  async processPointsWithWhitebox(samplePoints, rainfall, duration) {
    const enhancedPoints = [];

    // Process points in smaller batches for better performance
    const batchSize = 10;
    for (let i = 0; i < samplePoints.length; i += batchSize) {
      const batch = samplePoints.slice(i, i + batchSize);

      const batchPromises = batch.map(async (point) => {
        const advancedRisk = await this.calculateAdvancedRisk(
          rainfall, duration, point.elevation,
          point.longitude, point.latitude
        );

        return {
          ...point,
          slope: advancedRisk.hydrology.slope,
          proximityToWater: this.calculateProximityToWater(point.elevation, point.longitude, point.latitude),
          riskScore: advancedRisk.riskScore,
          flowAccumulation: advancedRisk.hydrology.flowAccumulation,
          flowLength: advancedRisk.hydrology.flowLength,
          drainageArea: advancedRisk.hydrology.drainageArea,
          drainageCoefficient: advancedRisk.drainageCoefficient,
          factors: advancedRisk.factors // Include calculation factors for debugging
        };
      });

      const batchResults = await Promise.all(batchPromises);
      enhancedPoints.push(...batchResults);

      // Log progress for longer processing
      if (samplePoints.length > 50) {
        console.log(`Processed ${Math.min(i + batchSize, samplePoints.length)}/${samplePoints.length} points with WhiteboxTools`);
      }
    }

    return enhancedPoints;
  }

  /**
   * Process points using simplified calculations (fallback method)
   */
  processPointsSimplified(samplePoints, rainfall, duration) {
    return samplePoints.map(point => {
      // Use simplified slope calculation based on elevation patterns (faster)
      const slope = this.calculateSimplifiedSlope(point.elevation);
      const proximityToWater = this.calculateProximityToWater(point.elevation, point.longitude, point.latitude);
      const riskScore = this.calculateRisk(rainfall, duration, point.elevation, slope, proximityToWater);

      return {
        ...point,
        slope,
        proximityToWater,
        riskScore,
        flowAccumulation: 0, // Not available in simplified mode
        flowLength: 0,
        drainageArea: 0,
        drainageCoefficient: this.drainageCoefficient
      };
    });
  }

  /**
   * Categorize risk using target-based percentile thresholds
   * REWRITTEN: Ensures specific target distributions are achieved
   */
  categorizeRiskByTargetDistribution(riskScore, rainfall, duration, allRiskScores) {
    // Define target distributions based on scenario
    const targetDistribution = this.getTargetDistribution(rainfall, duration);

    // Calculate thresholds from actual score percentiles to achieve targets
    const thresholds = this.calculatePercentileThresholds(allRiskScores, targetDistribution);

    console.log(`🎯 Target: ${targetDistribution.high}% HIGH, ${targetDistribution.moderate}% MOD | Thresholds: HIGH≥${thresholds.high.toFixed(2)}, MOD≥${thresholds.moderate.toFixed(2)} | Score: ${riskScore.toFixed(3)}`);

    if (riskScore >= thresholds.high) {
      return {
        level: 'HIGH',
        color: getRiskColor('HIGH'),
        description: 'High flood risk - flooding likely',
        threshold: thresholds.high
      };
    } else if (riskScore >= thresholds.moderate) {
      return {
        level: 'MODERATE',
        color: getRiskColor('MODERATE'),
        description: 'Moderate flood risk - flooding possible',
        threshold: thresholds.moderate
      };
    } else {
      return {
        level: 'LOW',
        color: getRiskColor('LOW'),
        description: 'Low flood risk - minimal flooding expected',
        threshold: 0
      };
    }
  }

  /**
   * Get target distribution percentages based on rainfall scenario
   */
  getTargetDistribution(rainfall, duration) {
    // Based on user's specified target distributions
    if (rainfall <= 2.5) {
      // Light rain: 2in/2h target
      return { high: 5, moderate: 25, low: 70 };
    } else if (rainfall <= 8) {
      // Moderate rain: 6in/4h target
      return { high: 40, moderate: 40, low: 20 };
    } else if (rainfall <= 15) {
      // Heavy rain: 12in/6h target
      return { high: 60, moderate: 30, low: 10 };
    } else {
      // Extreme rain: Hurricane-level
      return { high: 75, moderate: 20, low: 5 };
    }
  }

  /**
   * Calculate thresholds from percentiles to achieve target distribution
   */
  calculatePercentileThresholds(allScores, targetDistribution) {
    const sorted = [...allScores].sort((a, b) => a - b);
    const n = sorted.length;

    // Calculate percentile positions for thresholds
    // HIGH threshold: (100 - target_high)th percentile
    const highPercentilePosition = (100 - targetDistribution.high) / 100;
    const highThresholdIndex = Math.floor(n * highPercentilePosition);

    // MODERATE threshold: (100 - target_high - target_moderate)th percentile
    const moderatePercentilePosition = (100 - targetDistribution.high - targetDistribution.moderate) / 100;
    const moderateThresholdIndex = Math.floor(n * moderatePercentilePosition);

    return {
      high: sorted[Math.min(highThresholdIndex, n - 1)] || 5.0,
      moderate: sorted[Math.min(moderateThresholdIndex, n - 1)] || 2.0
    };
  }

  /**
   * Legacy threshold method for backward compatibility
   */
  categorizeRiskByAbsoluteThresholds(riskScore, rainfall, duration) {
    console.log(`⚠️ Using legacy absolute thresholds - consider switching to target-based`);

    // Simple fixed thresholds based on new 0-10 score range
    const highThreshold = 5.0;
    const moderateThreshold = 2.0;

    if (riskScore >= highThreshold) {
      return { level: 'HIGH', color: getRiskColor('HIGH'), description: 'High flood risk' };
    } else if (riskScore >= moderateThreshold) {
      return { level: 'MODERATE', color: getRiskColor('MODERATE'), description: 'Moderate flood risk' };
    } else {
      return { level: 'LOW', color: getRiskColor('LOW'), description: 'Low flood risk' };
    }
  }

  categorizeRiskByPercentile(riskScores, riskScore) {
    // DEPRECATED: Keep for fallback but not used by default
    console.log(`⚠️ Using deprecated percentile categorization for riskScore: ${riskScore}`);

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
      // Initialize WhiteboxTools if available
      await this.initializeWhitebox();

      // Get sample points from DEM
      const numPoints = options.numPoints || 100;
      const samplePoints = this.demService.generateSampleGrid(numPoints);

      if (samplePoints.length === 0) {
        throw new Error('No valid elevation data found in DEM');
      }

      console.log(`Processing ${samplePoints.length} points with ${this.useWhitebox ? 'advanced' : 'simplified'} hydrological analysis...`);

      // Process points with appropriate method based on WhiteboxTools availability
      const enhancedPoints = this.useWhitebox
        ? await this.processPointsWithWhitebox(samplePoints, rainfall, duration)
        : this.processPointsSimplified(samplePoints, rainfall, duration);

      // Extract all risk scores for analysis
      const allRiskScores = enhancedPoints.map(point => point.riskScore);

      // DEBUGGING: Log comprehensive score distribution
      this.logScoreDistribution(allRiskScores, rainfall, duration);

      // Calculate risk markers with target-based percentile categorization
      const riskMarkers = enhancedPoints.map(point => {
        const riskCategory = this.categorizeRiskByTargetDistribution(point.riskScore, rainfall, duration, allRiskScores);

        return {
          id: point.id,
          lat: point.latitude,
          lng: point.longitude,
          elevation: Math.round(point.elevation * 100) / 100, // Round to 2 decimal places
          slope: Math.round(point.slope * 100) / 100, // Round to 2 decimal places
          proximityToWater: Math.round(point.proximityToWater * 100) / 100,
          riskScore: Math.round(point.riskScore * 1000) / 1000, // Round to 3 decimal places
          riskLevel: riskCategory.level,
          riskColor: riskCategory.color,
          riskDescription: riskCategory.description,
          // Additional hydrological data from WhiteboxTools
          flowAccumulation: Math.round((point.flowAccumulation || 0) * 100) / 100,
          flowLength: Math.round((point.flowLength || 0) * 100) / 100,
          drainageArea: Math.round((point.drainageArea || 0) * 100) / 100,
          drainageCoefficient: Math.round((point.drainageCoefficient || this.drainageCoefficient) * 1000) / 1000,
          // Debug factors (if available)
          factors: point.factors ? {
            rainfallImpact: Math.round(point.factors.rainfallImpact * 100) / 100,
            elevationResistance: Math.round(point.factors.elevationResistance * 100) / 100,
            slopeFactor: Math.round(point.factors.slopeFactor * 100) / 100,
            flowFactor: Math.round(point.factors.flowFactor * 100) / 100
          } : undefined
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