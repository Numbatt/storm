const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Fifth Ward Flood Simulation API',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/dem-info', (req, res) => {
  res.json({
    bounds: {
      north: 29.775,
      south: 29.745,
      east: -95.350,
      west: -95.380
    },
    resolution: 1,
    metadata: {
      source: 'Placeholder - Fifth Ward DEM data',
      coordinate_system: 'WGS84'
    }
  });
});

app.post('/api/simulation', (req, res) => {
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

  const startTime = Date.now();

  const sampleMarkers = [
    {
      id: 1,
      lat: 29.760,
      lng: -95.365,
      riskLevel: 'HIGH',
      riskScore: 0.9
    },
    {
      id: 2,
      lat: 29.755,
      lng: -95.370,
      riskLevel: 'MODERATE',
      riskScore: 0.6
    },
    {
      id: 3,
      lat: 29.765,
      lng: -95.355,
      riskLevel: 'LOW',
      riskScore: 0.3
    }
  ];

  const processingTime = Date.now() - startTime;

  res.json({
    riskMarkers: sampleMarkers,
    processingTime,
    parameters: { rainfall, duration }
  });
});

app.listen(PORT, () => {
  console.log(`Fifth Ward Flood Simulation API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;