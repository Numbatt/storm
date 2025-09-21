# CLAUDE.md - Fifth Ward Houston Flood Simulation Web App

## Project Overview
This is a web application that simulates flood risk in Houston's Fifth Ward using DEM elevation data and user-configurable rainfall parameters. The app provides an intuitive interface for scenario-based flood modeling with AI-generated explanations of risk factors.

## Workflow Instructions
- **Always read PLANNING.md at the start of a new conversation**
- **Check TASKS.md before starting your work**
- **Mark completed tasks immediately**
- **Add newly discovered tasks**

## Core Technology Stack
- **Frontend**: React.js with Leaflet.js for mapping
- **Backend**: Node.js with Express.js
- **Geospatial Processing**: WhiteboxTools (Python bindings or CLI)
- **Data Format**: DEM elevation data in .tif format
- **AI Integration**: NVIDIA NIM for risk explanations
- **Map Display**: Satellite imagery base layer (OpenStreetMap or CartoDB)

## Key Features
1. **Interactive Map**: Leaflet.js map showing Fifth Ward satellite imagery
2. **Simulation Controls**: Rainfall amount (0-20 inches) and duration (0.5-8 hours) sliders
3. **Risk Assessment**: Color-coded markers (Red=High, Yellow=Moderate, Green=Low risk)
4. **Marker Clustering**: Intelligent spatial grouping to reduce visual clutter
5. **AI Explanations**: NVIDIA NIM-generated explanations for each risk marker

## File Structure
```
flood-simulation-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── FloodMap.jsx
│   │   │   │   ├── RiskMarker.jsx
│   │   │   │   └── MarkerCluster.jsx
│   │   │   ├── Controls/
│   │   │   │   ├── SimulationControls.jsx
│   │   │   │   ├── RainfallSlider.jsx
│   │   │   │   └── DurationSlider.jsx
│   │   │   └── UI/
│   │   │       ├── LoadingSpinner.jsx
│   │   │       └── RiskExplanationModal.jsx
│   │   ├── services/
│   │   │   ├── simulationAPI.js
│   │   │   └── mapService.js
│   │   ├── store/
│   │   │   ├── simulationSlice.js
│   │   │   └── store.js
│   │   └── utils/
│   │       ├── riskCalculations.js
│   │       └── geoUtils.js
├── backend/
│   ├── routes/
│   │   ├── simulation.js
│   │   ├── explanation.js
│   │   └── dem-info.js
│   ├── services/
│   │   ├── whiteboxService.js
│   │   ├── riskProcessor.js
│   │   ├── clusteringService.js
│   │   └── nvidiaService.js
│   ├── data/
│   │   └── fifth-ward-dem.tif
│   └── utils/
│       ├── gdalProcessor.js
│       └── coordinateTransform.js
└── docs/
    ├── API.md
    └── DEPLOYMENT.md
```

## Core API Endpoints
```
POST /api/simulation
- Body: { rainfall: number (0-20), duration: number (0.5-8) }
- Returns: { riskMarkers: Array, processingTime: number }

GET /api/explanation/:markerId
- Returns: { explanation: string, riskLevel: string }

GET /api/dem-info
- Returns: { bounds: object, resolution: number, metadata: object }
```

## Risk Assessment Logic
```javascript
// Core risk calculation
riskScore = (rainfallAmount * duration) / (elevation + drainageCoefficient)

// Risk categorization
if (riskScore > 0.8) return 'HIGH'    // Red markers
if (riskScore > 0.4) return 'MODERATE' // Yellow markers
return 'LOW'                          // Green markers
```

## WhiteboxTools Integration
Key tools to use:
- `FlowAccumulation`: Calculate water flow patterns
- `Slope`: Derive slope from DEM for drainage analysis
- `Watershed`: Identify drainage basins
- `FlowLength`: Calculate flow path distances

Processing pipeline:
1. Load DEM data using whitebox_tools
2. Calculate slope and flow accumulation
3. Apply rainfall intensity formula
4. Generate risk scores
5. Apply spatial clustering to reduce marker density

## NVIDIA NIM Integration
**Context Template:**
```
Generate a brief explanation for why this location has {riskLevel} flood risk.
Context: Elevation: {elevation}m, Rainfall: {rainfall}inches over {duration}hours, 
Drainage coefficient: {drainageCoeff}
Location: Fifth Ward, Houston near {nearbyFeatures}
```

**Implementation Notes:**
- Cache generated explanations to reduce API calls
- Implement fallback pre-written explanations
- Manage rate limiting to stay within API limits

## Development Phases

### Phase 1: MVP (Current Focus)
- [ ] Basic Leaflet.js map with satellite imagery
- [ ] DEM data loading pipeline (backend)
- [ ] Simple risk calculation without WhiteboxTools
- [ ] Basic marker placement
- [ ] Slider controls for rainfall parameters

### Phase 2: Core Functionality
- [ ] WhiteboxTools integration
- [ ] Advanced hydrological risk calculation
- [ ] Marker clustering implementation
- [ ] Loading states and error handling

### Phase 3: AI Enhancement
- [ ] NVIDIA NIM integration
- [ ] AI-generated risk explanations
- [ ] Caching and optimization

### Phase 4: Polish & Deploy
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Documentation and deployment

## Key Implementation Guidelines

### Frontend Development
- Use Leaflet.js with OpenStreetMap or CartoDB tile layers
- Implement React state management for simulation parameters
- Create reusable components for sliders and map markers
- Handle async operations with proper loading states

### Backend Development
- Process DEM data server-side only (not for visualization)
- Implement spatial clustering to prevent marker overlap
- Use minimum 100-meter distance between same-risk markers
- Cache expensive calculations when possible

### Data Handling
- DEM file contains Fifth Ward elevation data in .tif format
- All coordinate transformations must maintain spatial accuracy
- Implement proper error handling for large file processing

## Performance Targets
- **Simulation Processing**: < 10 seconds
- **Map Rendering**: < 2 seconds for marker display
- **AI Explanations**: < 3 seconds response time

## Common Development Tasks

### Adding New Risk Factors
1. Update risk calculation formula in `utils/riskCalculations.js`
2. Modify backend processing in `services/riskProcessor.js`
3. Update API documentation

### Modifying Map Behavior
1. Check Leaflet.js documentation for plugin options
2. Update `components/Map/FloodMap.jsx`
3. Test marker clustering performance with large datasets

### Integrating New WhiteboxTools
1. Research tool documentation at whitebox-tools.org
2. Add tool integration in `services/whiteboxService.js`
3. Update processing pipeline and test with sample data

### Debugging Geospatial Issues
1. Verify coordinate system consistency (likely WGS84)
2. Check DEM data bounds match Fifth Ward area
3. Use GDAL tools for data validation

## Environment Variables
```
# Backend
NVIDIA_NIM_API_KEY=your_api_key_here
DEM_FILE_PATH=./data/fifth-ward-dem.tif
DRAINAGE_COEFFICIENT=0.5
PORT=3001

# Frontend
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_MAPBOX_TOKEN=optional_for_enhanced_tiles
```

## Testing Strategy
- Unit tests for risk calculation algorithms
- Integration tests for WhiteboxTools processing
- End-to-end tests for complete simulation workflow
- Performance tests for large DEM data processing

## Deployment Considerations
- DEM files can be large - consider cloud storage
- WhiteboxTools requires Python environment on server
- NVIDIA NIM requires API key management
- Consider containerization for consistent environment

## Learning Objectives
This project teaches:
- Geospatial data processing with scientific computing tools
- Integration of domain-specific libraries (WhiteboxTools)
- Async processing and performance optimization
- External API integration and caching strategies
- Map-based data visualization with Leaflet.js
- React state management for complex user interactions

## Known Challenges
- Large DEM files require careful memory management
- WhiteboxTools processing can be computationally intensive
- Coordinate system transformations must be precise
- Balancing marker density with information completeness
- Managing external API costs and rate limits

---

**Next Development Session Focus**: Start with Phase 1 MVP - setting up the basic Leaflet.js map interface and DEM data loading pipeline.