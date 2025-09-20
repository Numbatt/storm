# Ponding Twin - Flood Risk Assessment System

An interactive flood risk assessment tool for Greater Fifth Ward, Houston, combining hydrological modeling with real-time visualization.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Generate sample data (for testing):**
   ```bash
   python generate_sample_data.py
   ```

4. **Start the FastAPI server:**
   ```bash
   python app.py --reload
   ```
   
   The API will be available at: http://localhost:8000

### Frontend Setup

1. **Navigate to web directory:**
   ```bash
   cd web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The web app will be available at: http://localhost:3000

## 📁 Project Structure

```
ponding-twin/
├── backend/                 # FastAPI backend
│   ├── app.py              # Main API application
│   ├── risk.py             # Risk assessment engine
│   ├── grid.py             # Grid data management
│   ├── schemas.py          # API data models
│   ├── preprocess.py       # Data preprocessing
│   ├── generate_sample_data.py  # Sample data generator
│   ├── data/               # Data files
│   └── utils/              # Utility functions
└── web/                    # React frontend
    ├── src/
    │   ├── App.tsx         # Main application
    │   ├── components/     # React components
    │   ├── map/           # Map components
    │   ├── types.ts       # TypeScript types
    │   └── api.ts         # API client
    ├── index.html         # HTML template
    └── package.json       # Dependencies
```

## 🔧 API Endpoints

- `GET /health` - Health check
- `GET /meta` - Grid metadata
- `GET /point?lat={lat}&lon={lon}` - Point elevation query
- `POST /risk/assess` - Single point risk assessment
- `POST /risk/bulk` - Bulk risk assessment
- `POST /risk/grid` - Grid-wide risk assessment
- `POST /risk/tiered` - Tiered risk areas

## 🎯 Features

- **Interactive Risk Assessment**: Adjust rainfall scenarios and see real-time risk updates
- **Tiered Risk Visualization**: View risk areas by severity level
- **Point Inspection**: Click on map to inspect specific locations
- **Performance Optimized**: Efficient caching and data loading
- **Responsive Design**: Works on desktop and mobile

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/
```

### Frontend Development
```bash
cd web
npm run dev
```

## 📊 Data Requirements

The application requires these data files in `backend/data/`:
- `Z.npy` - Elevation data (NumPy array)
- `ACC.npy` - Flow accumulation data (NumPy array)
- `georef.json` - Georeference information
- `dem_quarter.tif` - DEM raster file

Use `generate_sample_data.py` to create sample data for testing.

## 🔧 Configuration

### Backend Configuration
- Risk assessment parameters in `risk.py`
- API settings in `app.py`
- Data paths in `grid.py`

### Frontend Configuration
- API base URL in `vite.config.ts`
- Map settings in `map/LeafletMap.tsx`
- UI configuration in `components/Controls.tsx`

## 🐛 Troubleshooting

### Common Issues

1. **"Grid data not loaded" error:**
   - Run `python generate_sample_data.py` in the backend directory
   - Ensure all required data files exist in `backend/data/`

2. **Frontend can't connect to backend:**
   - Verify backend is running on http://localhost:8000
   - Check CORS settings in `app.py`

3. **Missing dependencies:**
   - Backend: `pip install -r requirements.txt`
   - Frontend: `npm install`

### Development Tips

- Use `python app.py --reload` for auto-restart on backend changes
- Frontend hot-reloads automatically with `npm run dev`
- Check browser console for frontend errors
- Check terminal for backend errors

## 📈 Performance Notes

- Risk calculations are cached for performance
- Large datasets may require increased memory
- Use the "Run Assessment" button to control when calculations occur
- Toggle risk tiers to focus on specific areas

## 🔮 Future Enhancements

- Real-time data updates
- Historical analysis
- Export functionality
- User authentication
- Multi-user collaboration

---

**Built for local development and testing of flood risk assessment algorithms.**
