# Storm - AI-Powered Flood Risk Assessment Platform

A comprehensive flood risk analysis platform that combines computer vision, machine learning, and geospatial analysis to provide real-time flood risk assessments and actionable mitigation recommendations.

## Overview

Storm is an advanced flood risk assessment platform that leverages AI-powered computer vision to analyze street-level imagery and provide comprehensive flood risk evaluations. The platform combines multiple data sources including elevation data, weather forecasts, surface analysis, and infrastructure assessment to deliver actionable insights for flood mitigation planning.

### Key Features

- **AI-Powered Surface Analysis**: Uses Mask2Former with Mapillary Vistas dataset for precise surface type detection
- **Real-time Risk Assessment**: Dynamic flood risk scoring based on multiple environmental factors
- **Interactive Visualization**: Heat maps, risk markers, and segmented imagery for intuitive data exploration
- **Actionable Recommendations**: Detailed mitigation strategies with cost estimates and implementation timelines
- **Multi-location Support**: Analyze any coordinate worldwide with pre-processed data for major cities
- **Responsive Design**: Optimized for desktop and mobile devices with dark/light theme support

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Services   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • Interactive   │    │ • REST API      │    │ • Mask2Former   │
│   Maps          │    │ • Data Services │    │ • Flood Scoring │
│ • Risk          │    │ • File Serving  │    │ • Recommender   │
│   Visualization │    │ • CORS Support  │    │ • AI Insights   │
│ • Controls      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack

#### Frontend
- **React 19.1.1** - Modern UI framework with hooks and context
- **Vite 4.5.3** - Fast build tool and development server
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Framer Motion 12.23.16** - Animation and gesture library
- **React Leaflet 5.0.0** - Interactive maps with Leaflet
- **Redux Toolkit 2.9.0** - State management with RTK Query
- **Recharts 3.2.1** - Data visualization components

#### Backend
- **Node.js** - JavaScript runtime environment
- **Express 5.1.0** - Web application framework
- **CORS 2.8.5** - Cross-origin resource sharing
- **Multer 2.0.2** - File upload handling

#### AI/ML Services
- **Python 3.8+** - Core AI processing language
- **PyTorch 2.0.0** - Deep learning framework
- **Transformers 4.30.0** - Hugging Face model library
- **Mask2Former** - Semantic segmentation model
- **OpenCV 4.8.0** - Computer vision processing
- **Pillow 10.0.0** - Image processing
- **NumPy 1.24.0** - Numerical computing

#### Data Sources
- **Google Street View API** - Street-level imagery
- **Google Elevation API** - Terrain elevation data
- **OpenWeather API** - Weather and rainfall data
- **DEM (Digital Elevation Model)** - Local terrain analysis

## 📁 Project Structure

```
storm/
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Controls/       # Simulation controls
│   │   │   ├── Hero/          # Landing page components
│   │   │   ├── Map/           # Map and visualization
│   │   │   └── AIInsightFeed.jsx
│   │   ├── contexts/          # React context providers
│   │   ├── pages/             # Main application pages
│   │   ├── store/             # Redux store and slices
│   │   └── utils/             # Utility functions
│   ├── public/                # Static assets
│   └── package.json
├── backend/                    # Node.js backend services
│   ├── api/                   # Python AI services
│   │   ├── src/
│   │   │   ├── ai_insights/   # AI insights generation
│   │   │   ├── data_fetch/    # External API integrations
│   │   │   ├── recommend/     # Mitigation recommendations
│   │   │   ├── scoring/       # Flood risk scoring
│   │   │   └── vision/        # Computer vision processing
│   │   ├── data/              # Processed data and results
│   │   ├── main.py            # Main analysis pipeline
│   │   └── requirements.txt
│   ├── services/              # Node.js service modules
│   ├── routes/                # API route handlers
│   └── index.js               # Express server entry point
├── data/                      # Shared data files
└── docs/                      # Documentation
```

## Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Python** 3.8 or higher
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd storm
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (root, frontend, and backend)
   npm run install:all
   
   # Or install individually
   npm install                    # Root dependencies
   npm install --prefix frontend  # Frontend dependencies
   npm install --prefix backend   # Backend dependencies
   ```

3. **Set up Python environment**
   ```bash
   cd backend/api
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the `backend/api/` directory:
   ```env
   # Google APIs (required for full functionality)
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   GOOGLE_STREET_VIEW_API_KEY=your_street_view_api_key
   GOOGLE_ELEVATION_API_KEY=your_elevation_api_key
   
   # Weather API
   OPENWEATHER_API_KEY=your_openweather_api_key
   
   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Application

#### Development Mode

1. **Start all services simultaneously**
   ```bash
   npm run dev
   ```
   This will start both frontend (port 5173) and backend (port 3001) services.

2. **Or start services individually**
   ```bash
   # Terminal 1: Start backend
   npm run dev:backend
   
   # Terminal 2: Start frontend
   npm run dev:frontend
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - API Health Check: http://localhost:3001/api/health

#### Production Mode

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Start the backend**
   ```bash
   npm run start
   ```

## Configuration

### API Keys Setup

The application requires several API keys for full functionality:

1. **Google Maps Platform**
   - Enable: Maps JavaScript API, Street View Static API, Elevation API
   - Get API key from [Google Cloud Console](https://console.cloud.google.com/)

2. **OpenWeather API**
   - Sign up at [OpenWeatherMap](https://openweathermap.org/api)
   - Free tier provides 1,000 calls/day

3. **OpenAI API** (Optional)
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Used for AI insights generation

### Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in `backend/api/`:

```env
# Required APIs
GOOGLE_MAPS_API_KEY=your_key_here
GOOGLE_STREET_VIEW_API_KEY=your_key_here
GOOGLE_ELEVATION_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here

# Server Configuration
PORT=3001
NODE_ENV=development
```

## Usage

### Basic Workflow

1. **Launch the application** and navigate to the main interface
2. **Select coordinates** using the interactive map or manual input
3. **Configure parameters**:
   - Rainfall amount (5-200mm)
   - Storm duration (0.5-8 hours)
   - Road type (residential, highway, etc.)
4. **Run analysis** to process the location
5. **Review results**:
   - Surface coverage analysis
   - Flood risk assessment
   - Mitigation recommendations
   - Cost estimates and timelines

### Available Analysis Modes

#### 1. Interactive Simulation
- Real-time flood risk visualization
- Heat map overlays on interactive maps
- Dynamic parameter adjustment
- Risk marker clustering

#### 2. Detailed Risk Analysis
- Comprehensive location assessment
- AI-powered surface segmentation
- Terrain and elevation analysis
- Detailed mitigation recommendations

#### 3. Storm Analysis Flow
- Step-by-step analysis process
- Lightning bolt visualization
- Progressive data loading
- Interactive step navigation

### Pre-processed Locations

The application includes pre-processed data for several major cities:

- **Houston, TX** (29.7158, -95.4018)
- **San Francisco, CA** (37.7749, -122.4194)
- **Palo Alto, CA** (37.4203, -122.0369)

These locations have pre-analyzed street view imagery and can be accessed instantly.

## AI and Machine Learning

### Computer Vision Pipeline

1. **Image Acquisition**: Street View API fetches 4-directional imagery (0°, 90°, 180°, 270°)
2. **Segmentation**: Mask2Former model processes images for surface type detection
3. **Classification**: Surfaces categorized as asphalt, greenery, or other
4. **Analysis**: Percentage calculations and risk factor assessment

### Flood Risk Scoring Algorithm

The scoring system considers multiple factors:

- **Surface Permeability** (40% weight): Asphalt vs. vegetation coverage
- **Terrain Slope** (25% weight): Natural drainage potential
- **Rainfall Intensity** (25% weight): Storm severity and duration
- **Drainage Infrastructure** (10% weight): Existing mitigation systems

### Risk Levels

- **LOW** (0-24): Minimal flood risk under normal conditions
- **MEDIUM** (25-59): Moderate risk during heavy rainfall
- **HIGH** (60-100): Significant risk requiring mitigation measures

## API Endpoints

### Core Analysis
- `POST /api/flood-analysis/analyze` - Run complete flood analysis
- `GET /api/flood-analysis/coordinates` - List available pre-processed locations
- `GET /api/flood-analysis/health` - Service health check

### Simulation
- `POST /api/simulation` - Run flood simulation with parameters
- `GET /api/elevation` - Get elevation data for coordinates
- `GET /api/dem-info` - Digital elevation model information

### AI Services
- `POST /api/ai-insights/generate` - Generate AI insights
- `POST /api/ai-insights/dynamic` - Dynamic insights based on rainfall
- `GET /api/ai-insights/health` - AI service status

### Static Files
- `GET /static/results/{coordinates}/` - Segmented imagery results

## Development

### Code Structure

#### Frontend Architecture
- **Component-based design** with reusable UI elements
- **Context providers** for location and theme management
- **Redux store** for state management and data persistence
- **Custom hooks** for API integration and data fetching

#### Backend Services
- **Modular service architecture** with clear separation of concerns
- **RESTful API design** with comprehensive error handling
- **CORS configuration** for cross-origin requests
- **File serving** for static assets and results

#### AI Pipeline
- **Object-oriented design** with clear class hierarchies
- **Configuration-driven** approach for easy customization
- **Error handling** and fallback mechanisms
- **Debugging support** with detailed logging


## Performance Optimization

### Frontend Optimizations
- **Code splitting** with React.lazy()
- **Image optimization** with lazy loading
- **Memoization** with React.memo() and useMemo()
- **Bundle analysis** with Vite's built-in tools

### Backend Optimizations
- **Caching** for frequently accessed data
- **Image compression** for segmented results
- **API rate limiting** to prevent abuse
- **Database indexing** for fast queries

### AI Pipeline Optimizations
- **Model caching** to avoid repeated loading
- **Batch processing** for multiple images
- **GPU acceleration** when available
- **Memory management** for large datasets


Thanks for checking out our project!

**Storm** - Empowering communities with AI-driven flood risk assessment and mitigation planning.
