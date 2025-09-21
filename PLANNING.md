# PLANNING.md - Fifth Ward Houston Flood Simulation Web App

## Project Vision

### Mission Statement
Create an accessible, web-based flood risk assessment tool that empowers Houston Fifth Ward residents, urban planners, and emergency management officials to understand and prepare for flood scenarios through real-time simulation and AI-powered explanations.

### Success Criteria
- **Usability**: Non-technical users can run flood simulations without training
- **Accuracy**: Risk assessments align with known flood-prone areas in Fifth Ward
- **Performance**: Simulations complete in under 10 seconds
- **Educational Value**: AI explanations help users understand flood risk factors
- **Accessibility**: Works on desktop and tablet devices
- **Interactive Inspection**: Shift+hover coordinate inspection is accurate and responsive
- **Risk Assessment Tools**: Shift+click risk assessment provides detailed location analysis

### Target Users
1. **Primary**: Fifth Ward residents seeking to understand flood risk for their properties
2. **Secondary**: Urban planners and emergency management officials
3. **Tertiary**: Researchers and students studying urban hydrology

## Technical Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │ External APIs   │
│   (React +      │◄──►│   (Node.js +     │◄──►│ NVIDIA NIM      │
│   Leaflet.js)   │    │   WhiteboxTools) │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       
         │                       │                       
         ▼                       ▼                       
┌─────────────────┐    ┌──────────────────┐              
│   User Device   │    │   DEM Data       │              
│   (Browser)     │    │   (.tif files)   │              
└─────────────────┘    └──────────────────┘              
```

### Data Flow Architecture
1. **User Input**: Rainfall parameters via sliders → Frontend state
2. **Simulation Request**: Frontend → Backend API with parameters
3. **Data Processing**: Backend loads DEM data → WhiteboxTools processing
4. **Risk Calculation**: Hydrological analysis → Risk scoring algorithm
5. **Spatial Clustering**: Reduce marker density → Generate marker positions
6. **Response**: Risk markers data → Frontend for map visualization
7. **AI Explanations**: On-demand marker clicks → NVIDIA NIM → Explanations

### Component Architecture

#### Frontend Components
```
App
├── MapContainer
│   ├── FloodMap (Leaflet.js integration)
│   ├── RiskMarkerLayer
│   ├── MarkerCluster
│   ├── CoordinateInspector (Shift+hover overlay)
│   └── RiskAssessmentPopup (Shift+click window)
├── ControlPanel
│   ├── RainfallSlider (0-20 inches)
│   ├── DurationSlider (0.5-8 hours)
│   └── SimulationButton
├── ResultsDisplay
│   ├── LoadingSpinner
│   ├── RiskLegend
│   └── ExplanationModal
└── ErrorBoundary
```

#### Backend Services
```
API Layer
├── SimulationController
├── ExplanationController
└── DEMInfoController

Business Logic
├── RiskProcessor
├── ClusteringService
├── WhiteboxService
└── NVIDIAService

Data Layer
├── DEMDataLoader
├── CoordinateTransformer
└── CacheManager
```

## Technology Stack

### Frontend Stack
- **Framework**: React.js 18+ with functional components and hooks
- **State Management**: Redux Toolkit for complex state, useState for local state
- **Mapping Library**: Leaflet.js with React-Leaflet wrapper
- **Map Tiles**: OpenStreetMap or CartoDB for satellite imagery
- **Styling**: Tailwind CSS for utility-first styling
- **Build Tool**: Vite for fast development and optimized builds
- **Package Manager**: npm

### Backend Stack
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js for RESTful API
- **Geospatial Processing**: WhiteboxTools (Python CLI integration)
- **File Processing**: GDAL/OGR for raster data manipulation
- **HTTP Client**: Axios for external API calls (NVIDIA NIM)
- **Environment Management**: dotenv for configuration
- **Process Management**: PM2 for production deployment

### Data & External Services
- **Elevation Data**: GeoTIFF (.tif) format DEM files
- **AI Service**: NVIDIA NIM API for natural language generation
- **Map Tiles**: OpenStreetMap or free satellite imagery providers
- **Coordinate System**: WGS84 (EPSG:4326) for consistency

### Development Tools
- **Version Control**: Git with conventional commit messages
- **Code Quality**: ESLint + Prettier for consistent formatting
- **Testing**: Jest for unit tests, Cypress for E2E testing
- **API Testing**: Postman or Thunder Client for endpoint testing
- **Documentation**: Markdown files for project documentation

## Required Tools & Setup

### Development Environment
```bash
# Node.js and npm
node --version  # Should be 18+
npm --version   # Should be 8+

# Python (for WhiteboxTools)
python --version  # Should be 3.8+
pip --version

# Git
git --version
```

### Essential Software Installation

#### 1. WhiteboxTools
```bash
# Option A: Python package (recommended)
pip install whitebox

# Option B: Standalone binary
# Download from: https://github.com/jblindsay/whitebox-tools/releases
```

#### 2. GDAL (Geospatial Data Abstraction Library)
```bash
# macOS
brew install gdal

# Ubuntu/Debian
sudo apt-get install gdal-bin

# Windows
# Download from: https://gdal.org/download.html
```

#### 3. Project Dependencies
```bash
# Frontend dependencies
npm create vite@latest flood-simulation-frontend -- --template react
cd flood-simulation-frontend
npm install leaflet react-leaflet @reduxjs/toolkit react-redux tailwindcss

# Backend dependencies
mkdir flood-simulation-backend && cd flood-simulation-backend
npm init -y
npm install express cors dotenv axios multer
npm install -D nodemon
```

### Required Accounts & API Keys
- **NVIDIA NIM Account**: Developer access for AI explanations
- **GitHub Account**: For version control and potential deployment

### Data Requirements
- **Fifth Ward DEM File**: High-resolution elevation data in .tif format
  - Coordinate system: WGS84 or UTM Zone 15N
  - Resolution: 1-meter or better preferred
  - Coverage: Complete Fifth Ward boundary plus buffer zone
- **Boundary Data**: GeoJSON file defining Fifth Ward limits
- **Validation Data**: Known flood events for model validation (optional)

### Development Environment Setup
```bash
# Project structure creation
mkdir flood-simulation-app
cd flood-simulation-app
mkdir frontend backend data docs
```

### IDE Recommendations
- **VS Code** with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Leaflet Map snippets
  - Python extension (for WhiteboxTools integration)
  - Thunder Client (API testing)
  - GitLens (Git integration)

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)
- Set up development environment and project structure
- Create basic React app with Leaflet.js integration
- Implement DEM data loading pipeline (backend)
- Build slider controls for rainfall parameters
- Basic API endpoints without WhiteboxTools

### Phase 2: Core Functionality (Weeks 3-4)
- Integrate WhiteboxTools for hydrological analysis
- Implement risk calculation algorithms
- Add marker clustering to prevent visual clutter
- Enhance UI with loading states and error handling
- Complete simulation workflow end-to-end

### Phase 3: AI Integration (Weeks 5-6)
- Set up NVIDIA NIM API integration
- Implement context-aware explanation generation
- Add caching system for AI responses
- Create fallback explanations for API failures
- Polish user experience for marker interactions

### Phase 4: Optimization & Deployment (Weeks 7-8)
- Performance optimization for large datasets
- Cross-browser testing and mobile responsiveness
- Documentation completion
- Production deployment setup
- User acceptance testing

## Risk Assessment & Mitigation

### Technical Risks
1. **WhiteboxTools Integration Complexity**
   - Mitigation: Start with simple tools, build complexity gradually
   - Fallback: Implement simplified risk calculation if integration fails

2. **Large DEM File Performance**
   - Mitigation: Implement data streaming and caching
   - Fallback: Pre-process data into smaller tiles

3. **NVIDIA NIM API Costs**
   - Mitigation: Implement aggressive caching and rate limiting
   - Fallback: Pre-written explanations for common scenarios

### Project Risks
1. **Scope Creep**
   - Mitigation: Strict adherence to phased development plan
   - Process: Document new features in TASKS.md for future consideration

2. **Data Availability**
   - Mitigation: Identify multiple sources for DEM data
   - Fallback: Use publicly available USGS elevation data

## Success Metrics

### Technical Performance
- Simulation processing time: < 10 seconds
- Map rendering: < 2 seconds for 100+ markers
- API response time: < 500ms average
- Memory usage: < 2GB for backend processing

### User Experience
- Task completion rate: > 90% for first-time users
- Error rate: < 5% of simulation attempts
- User satisfaction: Positive feedback on explanation quality

### Code Quality
- Test coverage: > 80% for critical paths
- Code review: 100% of changes reviewed
- Documentation: Complete API documentation and user guides

---

**Current Status**: Project planning complete, ready to begin Phase 1 development
**Last Updated**: September 20, 2025
**Next Milestone**: Complete development environment setup and basic React + Leaflet.js integration