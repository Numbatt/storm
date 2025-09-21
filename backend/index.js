const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const DEMService = require('./services/demService');
const RiskProcessor = require('./services/riskProcessor');
const FloodAnalysisService = require('./services/floodAnalysisService');
const { router: debugRouter, setServices } = require('./routes/debug');
const AIInsightsService = require('./services/aiInsightsService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for segmentation results
const resultsPath = path.join(__dirname, 'api', 'data', 'results');
app.use('/static/results', express.static(resultsPath));

// Initialize services
let demService;
let riskProcessor;
let floodAnalysisService;
let aiInsightsService;

try {
  demService = new DEMService();
  riskProcessor = new RiskProcessor(demService);
  floodAnalysisService = new FloodAnalysisService();

  // Set up debug routes with service access
  setServices({
    demService,
    riskProcessor,
    floodAnalysisService
  });

  // Add debug routes
  app.use('/api/debug', debugRouter);

  console.log('DEM, Risk Processing, and Flood Analysis services initialized successfully');
  aiInsightsService = new AIInsightsService();
  console.log('DEM, Risk Processing, Flood Analysis, and AI Insights services initialized successfully');
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

    // Note: Removed cache checking - streetview.py will fetch fresh images every time

    // Prepare options
    const options = {};
    if (rainfall !== undefined) options.rainfall = rainfall;
    if (drains !== undefined) options.drains = drains;
    if (road_type !== undefined) options.road_type = road_type;
    if (debug !== undefined) options.debug = debug;

    console.log(`Starting flood analysis for coordinates: ${lat}, ${lon}`);
    
    // Perform analysis with enhanced error handling
    let analysisResult;
    try {
      analysisResult = await floodAnalysisService.analyzeCoordinates(lat, lon, options);
      
      if (!analysisResult) {
        throw new Error('Analysis returned no data');
      }
      
      console.log('✅ Flood analysis completed successfully');
    } catch (analysisError) {
      console.error('❌ Flood analysis failed:', analysisError.message);
      return res.status(500).json({
        error: 'Flood analysis failed',
        details: analysisError.message,
        coordinates: { lat, lon },
        timestamp: new Date().toISOString()
      });
    }

    // Generate AI insights if available
    let aiInsights = null;
    if (aiInsightsService && aiInsightsService.isAvailable()) {
      try {
        console.log('🤖 Generating AI insights...');
        aiInsights = await aiInsightsService.generateAIInsights(analysisResult);
        console.log('✅ AI insights generated successfully');
      } catch (insightError) {
        console.warn('⚠️ AI insights generation failed:', insightError.message);
        // Continue without AI insights rather than failing the whole request
        aiInsights = null;
      }
    } else {
      console.log('ℹ️ AI insights service not available');
    }

    // Ensure the response has all required fields
    const response = {
      success: true,
      analysis: {
        ...analysisResult,
        ai_insights: aiInsights
      },
      request: {
        coordinates: { lat, lon },
        parameters: options,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📤 Sending successful response');
    res.json(response);

  } catch (error) {
    console.error('Flood analysis error:', error);
    res.status(500).json({
      error: 'Flood analysis failed',
      details: error.message,
      coordinates: { lat, lon }
    });
  }
});

// AI Insights endpoints
app.post('/api/ai-insights/generate', async (req, res) => {
  const { analysisData } = req.body;

  if (!analysisData) {
    return res.status(400).json({
      error: 'Missing required parameter: analysisData'
    });
  }

  try {
    if (!aiInsightsService || !aiInsightsService.isAvailable()) {
      return res.status(503).json({
        error: 'AI insights service not available',
        message: 'OpenAI API key not configured or service unavailable'
      });
    }

    const insights = await aiInsightsService.generateAIInsights(analysisData);

    res.json({
      success: true,
      ai_insights: insights,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI insights generation error:', error);
    res.status(500).json({
      error: 'Failed to generate AI insights',
      details: error.message
    });
  }
});

app.post('/api/ai-insights/dynamic', async (req, res) => {
  const { baseAnalysis, rainfall } = req.body;

  if (!baseAnalysis || typeof rainfall !== 'number') {
    return res.status(400).json({
      error: 'Missing required parameters: baseAnalysis and rainfall (number)'
    });
  }

  if (rainfall < 0 || rainfall > 500) {
    return res.status(400).json({
      error: 'Invalid rainfall: must be between 0 and 500 mm'
    });
  }

  try {
    if (!aiInsightsService || !aiInsightsService.isAvailable()) {
      return res.status(503).json({
        error: 'AI insights service not available',
        message: 'OpenAI API key not configured or service unavailable'
      });
    }

    const dynamicInsights = await aiInsightsService.generateDynamicInsights(baseAnalysis, rainfall);

    res.json({
      success: true,
      ai_insights: dynamicInsights,
      rainfall_mm: rainfall,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dynamic AI insights generation error:', error);
    res.status(500).json({
      error: 'Failed to generate dynamic AI insights',
      details: error.message
    });
  }
});

app.get('/api/ai-insights/health', (req, res) => {
  const isAvailable = aiInsightsService && aiInsightsService.isAvailable();
  
  res.json({
    status: isAvailable ? 'available' : 'unavailable',
    service: 'AI Insights (GPT-4o-mini)',
    openai_configured: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Fifth Ward Flood Simulation API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Flood analysis health: http://localhost:${PORT}/api/flood-analysis/health`);
  console.log(`AI insights health: http://localhost:${PORT}/api/ai-insights/health`);
  console.log(`Available coordinates: http://localhost:${PORT}/api/flood-analysis/coordinates`);
  console.log(`Static files: http://localhost:${PORT}/static/results/`);
  console.log(`Debug endpoints: http://localhost:${PORT}/api/debug/algorithm-summary`);
});

module.exports = app;