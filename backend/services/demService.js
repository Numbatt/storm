const { execSync } = require('child_process');
const path = require('path');

class DEMService {
  constructor() {
    this.demPath = path.join(__dirname, '../../data/dem_quarter.tif');
    this.metadata = null;
    this.loadMetadata();
  }

  loadMetadata() {
    try {
      // Get DEM metadata using gdalinfo
      const gdalOutput = execSync(`gdalinfo "${this.demPath}"`, { encoding: 'utf8' });

      // Parse the output to extract key information
      const sizeMatch = gdalOutput.match(/Size is (\d+), (\d+)/);
      const pixelSizeMatch = gdalOutput.match(/Pixel Size = \(([-\d.]+),([-\d.]+)\)/);
      const upperLeftMatch = gdalOutput.match(/Upper Left\s+\(\s*([-\d.]+),\s*([-\d.]+)\)/);
      const lowerRightMatch = gdalOutput.match(/Lower Right\s+\(\s*([-\d.]+),\s*([-\d.]+)\)/);

      this.metadata = {
        width: sizeMatch ? parseInt(sizeMatch[1]) : null,
        height: sizeMatch ? parseInt(sizeMatch[2]) : null,
        pixelSizeX: pixelSizeMatch ? parseFloat(pixelSizeMatch[1]) : null,
        pixelSizeY: pixelSizeMatch ? parseFloat(pixelSizeMatch[2]) : null,
        upperLeft: upperLeftMatch ? [parseFloat(upperLeftMatch[1]), parseFloat(upperLeftMatch[2])] : null,
        lowerRight: lowerRightMatch ? [parseFloat(lowerRightMatch[1]), parseFloat(lowerRightMatch[2])] : null,
        coordinateSystem: 'EPSG:26915', // NAD83 / UTM zone 15N
        noDataValue: -9999
      };

      console.log('DEM metadata loaded:', this.metadata);
    } catch (error) {
      console.error('Error loading DEM metadata:', error.message);
    }
  }

  getDEMInfo() {
    if (!this.metadata) {
      throw new Error('DEM metadata not loaded');
    }

    // Convert UTM bounds to WGS84 for frontend
    const bounds = this.convertUTMBoundsToWGS84();

    return {
      bounds: bounds,
      resolution: Math.abs(this.metadata.pixelSizeX), // 5 meters
      metadata: {
        source: 'Fifth Ward Houston DEM',
        coordinate_system: 'WGS84',
        original_crs: this.metadata.coordinateSystem,
        width: this.metadata.width,
        height: this.metadata.height,
        pixel_size: this.metadata.pixelSizeX
      }
    };
  }

  convertUTMBoundsToWGS84() {
    try {
      // Use gdaltransform to convert UTM coordinates to WGS84
      const upperLeft = this.metadata.upperLeft;
      const lowerRight = this.metadata.lowerRight;

      // Convert upper left (northwest corner)
      const nwCommand = `echo "${upperLeft[0]} ${upperLeft[1]}" | gdaltransform -s_srs EPSG:26915 -t_srs EPSG:4326`;
      const nwResult = execSync(nwCommand, { encoding: 'utf8' }).trim().split(' ');

      // Convert lower right (southeast corner)
      const seCommand = `echo "${lowerRight[0]} ${lowerRight[1]}" | gdaltransform -s_srs EPSG:26915 -t_srs EPSG:4326`;
      const seResult = execSync(seCommand, { encoding: 'utf8' }).trim().split(' ');

      return {
        north: parseFloat(nwResult[1]),
        south: parseFloat(seResult[1]),
        east: parseFloat(seResult[0]),
        west: parseFloat(nwResult[0])
      };
    } catch (error) {
      console.error('Error converting coordinates:', error.message);
      // Fallback to approximate bounds
      return {
        north: 29.787,
        south: 29.743,
        east: -95.301,
        west: -95.355
      };
    }
  }

  getElevationAt(longitude, latitude) {
    try {
      // Convert WGS84 to UTM coordinates
      const utmCommand = `echo "${longitude} ${latitude}" | gdaltransform -s_srs EPSG:4326 -t_srs EPSG:26915`;
      const utmResult = execSync(utmCommand, { encoding: 'utf8' }).trim().split(' ');
      const utmX = parseFloat(utmResult[0]);
      const utmY = parseFloat(utmResult[1]);

      // Get elevation value using gdallocationinfo
      const elevCommand = `gdallocationinfo -valonly -geoloc "${this.demPath}" ${utmX} ${utmY}`;
      const elevation = execSync(elevCommand, { encoding: 'utf8' }).trim();

      const elevValue = parseFloat(elevation);

      // Check for NoData values
      if (elevValue === this.metadata.noDataValue || isNaN(elevValue)) {
        return null;
      }

      return elevValue;
    } catch (error) {
      console.error(`Error getting elevation at ${longitude}, ${latitude}:`, error.message);
      return null;
    }
  }

  generateSampleGrid(numPoints = 100) {
    // Use intelligent sampling for better performance and accuracy
    return this.generateIntelligentSampleGrid(numPoints);
  }

  generateIntelligentSampleGrid(numPoints = 250) {
    const bounds = this.convertUTMBoundsToWGS84();
    const points = [];

    // UPDATED: More balanced elevation sampling strategy to fix bias:
    // 40% in low elevation areas (<10m) - flood prone
    // 40% in medium elevation areas (10-20m) - moderate risk
    // 20% in high elevation areas (>20m) - lower risk
    const lowElevPoints = Math.floor(numPoints * 0.4);
    const medElevPoints = Math.floor(numPoints * 0.4);
    const highElevPoints = numPoints - lowElevPoints - medElevPoints;

    console.log(`Balanced sampling strategy: ${lowElevPoints} low, ${medElevPoints} medium, ${highElevPoints} high elevation points`);

    let pointId = 1;
    const maxAttempts = numPoints * 3; // Prevent infinite loops
    let attempts = 0;

    // Generate points with elevation-based probability
    while (points.length < numPoints && attempts < maxAttempts) {
      attempts++;

      // Random coordinate within bounds
      const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
      const lon = bounds.west + Math.random() * (bounds.east - bounds.west);

      const elevation = this.getElevationAt(lon, lat);

      if (elevation !== null) {
        // Determine target category counts
        const currentLow = points.filter(p => p.elevation < 10).length;
        const currentMed = points.filter(p => p.elevation >= 10 && p.elevation < 20).length;
        const currentHigh = points.filter(p => p.elevation >= 20).length;

        // Accept point based on elevation category and quota
        let acceptPoint = false;

        if (elevation < 10 && currentLow < lowElevPoints) {
          // Low elevation - high acceptance rate
          acceptPoint = Math.random() < 0.8;
        } else if (elevation >= 10 && elevation < 20 && currentMed < medElevPoints) {
          // Medium elevation - moderate acceptance rate
          acceptPoint = Math.random() < 0.6;
        } else if (elevation >= 20 && currentHigh < highElevPoints) {
          // High elevation - lower acceptance rate
          acceptPoint = Math.random() < 0.4;
        }

        // Add proximity-to-water bias (lower elevation = higher probability)
        if (acceptPoint) {
          const proximityBias = Math.max(0.3, (30 - elevation) / 30); // Higher bias for lower elevation
          acceptPoint = Math.random() < proximityBias;
        }

        if (acceptPoint) {
          points.push({
            id: pointId++,
            latitude: lat,
            longitude: lon,
            elevation: elevation
          });
        }
      }
    }

    console.log(`Generated ${points.length} intelligent sample points from DEM`);
    console.log(`Distribution: ${points.filter(p => p.elevation < 10).length} low, ${points.filter(p => p.elevation >= 10 && p.elevation < 20).length} medium, ${points.filter(p => p.elevation >= 20).length} high`);

    return points;
  }

  // Legacy uniform grid method (kept for comparison/fallback)
  generateUniformSampleGrid(numPoints = 100) {
    const bounds = this.convertUTMBoundsToWGS84();
    const points = [];

    // Calculate grid spacing
    const latStep = (bounds.north - bounds.south) / Math.sqrt(numPoints);
    const lonStep = (bounds.east - bounds.west) / Math.sqrt(numPoints);

    let pointId = 1;

    for (let lat = bounds.south; lat < bounds.north; lat += latStep) {
      for (let lon = bounds.west; lon < bounds.east; lon += lonStep) {
        const elevation = this.getElevationAt(lon, lat);

        if (elevation !== null) {
          points.push({
            id: pointId++,
            latitude: lat,
            longitude: lon,
            elevation: elevation
          });
        }
      }
    }

    console.log(`Generated ${points.length} uniform sample points from DEM`);
    return points;
  }
}

module.exports = DEMService;