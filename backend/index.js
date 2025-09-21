const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const DEMService = require('./services/demService');
const RiskProcessor = require('./services/riskProcessor');
const FloodAnalysisService = require('./services/floodAnalysisService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files for segmentation results
const resultsPath = path.join(__dirname, 'api', 'data', 'results');
app.use('/static/results', express.static(resultsPath));

// Initialize services
let demService;
let riskProcessor;
let floodAnalysisService;

try {
  demService = new DEMService();
  riskProcessor = new RiskProcessor(demService);
  floodAnalysisService = new FloodAnalysisService();
  console.log('DEM, Risk Processing, and Flood Analysis services initialized successfully');
} catch (error) {
  console.error('Error initializing services:', error.message);
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Fifth Ward Flood Simulation API',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/dem-info', (req, res) => {
  try {
    if (!demService) {
      return res.status(500).json({
        error: 'DEM service not available'
      });
    }

    const demInfo = demService.getDEMInfo();
    res.json(demInfo);
  } catch (error) {
    console.error('Error getting DEM info:', error);
    res.status(500).json({
      error: 'Failed to retrieve DEM information'
    });
  }
});

app.get('/api/elevation', (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters: lat and lng'
      });
    }

    if (!demService) {
      return res.status(500).json({
        error: 'DEM service not available'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude values'
      });
    }

    const elevation = demService.getElevationAt(longitude, latitude);

    res.json({
      elevation: elevation,
      coordinates: { lat: latitude, lng: longitude },
      success: elevation !== null
    });

  } catch (error) {
    console.error('Error getting elevation:', error);
    res.status(500).json({
      error: 'Failed to retrieve elevation data',
      details: error.message
    });
  }
});

app.post('/api/simulation', async (req, res) => {
  const { rainfall, duration } = req.body;

  if (!rainfall || !duration) {
    return res.status(400).json({
      error: 'Missing required parameters: rainfall and duration'
    });
  }

  if (rainfall < 0 || rainfall > 20) {
    return res.status(400).json({
      error: 'Rainfall must be between 0 and 20 inches'
    });
  }

  if (duration < 0.5 || duration > 8) {
    return res.status(400).json({
      error: 'Duration must be between 0.5 and 8 hours'
    });
  }

  try {
    if (!riskProcessor) {
      return res.status(500).json({
        error: 'Risk processing service not available'
      });
    }

    // Process simulation with real DEM data
    const simulationResult = await riskProcessor.processSimulation(rainfall, duration, {
      numPoints: 150, // Generate more points for better coverage
      minDistance: 0.002 // ~200m minimum distance between markers
    });

    res.json(simulationResult);

  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      error: 'Simulation processing failed',
      details: error.message
    });
  }
});

// Flood Analysis endpoints
app.get('/api/flood-analysis/health', async (req, res) => {
  try {
    if (!floodAnalysisService) {
      return res.status(500).json({
        error: 'Flood analysis service not available'
      });
    }

    const healthStatus = await floodAnalysisService.healthCheck();
    res.json(healthStatus);
  } catch (error) {
    console.error('Error checking flood analysis health:', error);
    res.status(500).json({
      error: 'Failed to check flood analysis service health',
      details: error.message
    });
  }
});

app.get('/api/flood-analysis/coordinates', (req, res) => {
  try {
    if (!floodAnalysisService) {
      return res.status(500).json({
        error: 'Flood analysis service not available'
      });
    }

    const availableCoordinates = floodAnalysisService.getAvailableCoordinates();
    res.json({
      coordinates: availableCoordinates,
      count: availableCoordinates.length,
      message: 'Available coordinates with processed images'
    });
  } catch (error) {
    console.error('Error getting available coordinates:', error);
    res.status(500).json({
      error: 'Failed to retrieve available coordinates',
      details: error.message
    });
  }
});

app.post('/api/flood-analysis/analyze', async (req, res) => {
  const { lat, lon, rainfall, drains, road_type, debug } = req.body;

  // Validate required parameters
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({
      error: 'Missing or invalid required parameters: lat and lon must be numbers'
    });
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90) {
    return res.status(400).json({
      error: 'Invalid latitude: must be between -90 and 90'
    });
  }

  if (lon < -180 || lon > 180) {
    return res.status(400).json({
      error: 'Invalid longitude: must be between -180 and 180'
    });
  }

  // Validate optional parameters
  if (rainfall !== undefined && (typeof rainfall !== 'number' || rainfall < 0 || rainfall > 200)) {
    return res.status(400).json({
      error: 'Invalid rainfall: must be a number between 0 and 200 mm'
    });
  }

  if (drains !== undefined && !['ok', 'none', 'unknown'].includes(drains)) {
    return res.status(400).json({
      error: 'Invalid drains: must be one of "ok", "none", or "unknown"'
    });
  }

  try {
    if (!floodAnalysisService) {
      return res.status(500).json({
        error: 'Flood analysis service not available'
      });
    }

    // Check if processed images exist for these coordinates
    const hasImages = floodAnalysisService.hasProcessedImages(lat, lon);
    if (!hasImages) {
      return res.status(404).json({
        error: 'No processed images available for these coordinates',
        message: 'Use /api/flood-analysis/coordinates to see available locations',
        coordinates: { lat, lon }
      });
    }

    // Prepare options
    const options = {};
    if (rainfall !== undefined) options.rainfall = rainfall;
    if (drains !== undefined) options.drains = drains;
    if (road_type !== undefined) options.road_type = road_type;
    if (debug !== undefined) options.debug = debug;

    console.log(`Starting flood analysis for coordinates: ${lat}, ${lon}`);
    
    // Perform analysis
    const analysisResult = await floodAnalysisService.analyzeCoordinates(lat, lon, options);

    res.json({
      success: true,
      analysis: analysisResult,
      request: {
        coordinates: { lat, lon },
        parameters: options,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Flood analysis error:', error);
    res.status(500).json({
      error: 'Flood analysis failed',
      details: error.message,
      coordinates: { lat, lon }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Fifth Ward Flood Simulation API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Flood analysis health: http://localhost:${PORT}/api/flood-analysis/health`);
  console.log(`Available coordinates: http://localhost:${PORT}/api/flood-analysis/coordinates`);
});

module.exports = app;