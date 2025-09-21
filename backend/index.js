const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const DEMService = require('./services/demService');
const RiskProcessor = require('./services/riskProcessor');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize services
let demService;
let riskProcessor;

try {
  demService = new DEMService();
  riskProcessor = new RiskProcessor(demService);
  console.log('DEM and Risk Processing services initialized successfully');
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

app.listen(PORT, () => {
  console.log(`Fifth Ward Flood Simulation API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;