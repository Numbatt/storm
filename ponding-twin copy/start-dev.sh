#!/bin/bash

# Ponding Twin - Local Development Startup Script

echo "🚀 Starting Ponding Twin Development Environment"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "backend/app.py" ] || [ ! -f "web/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected files: backend/app.py, web/package.json"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists python3; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Generate sample data if needed
echo ""
echo "📊 Setting up backend data..."
cd backend

if [ ! -f "data/Z.npy" ] || [ ! -f "data/ACC.npy" ] || [ ! -f "data/georef.json" ]; then
    echo "   Generating sample data..."
    python3 generate_sample_data.py
else
    echo "   Sample data already exists"
fi

# Install Python dependencies
echo "   Installing Python dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

# Start backend in background
echo "   Starting backend server..."
python3 app.py --reload &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend started successfully (http://localhost:8000)"

# Setup frontend
echo ""
echo "🌐 Setting up frontend..."
cd ../web

# Install npm dependencies
echo "   Installing npm dependencies..."
npm install > /dev/null 2>&1

# Start frontend
echo "   Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait a moment for frontend to start
sleep 5

echo ""
echo "🎉 Development environment started successfully!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "💡 Tips:"
echo "   - Use 'Run Assessment' button to update risk analysis"
echo "   - Adjust rainfall parameters and click 'Run Assessment'"
echo "   - Toggle risk tiers to focus on specific areas"
echo "   - Click on map to inspect locations"
echo ""
echo "🛑 To stop the servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   or press Ctrl+C and run: pkill -f 'python.*app.py' && pkill -f 'npm.*dev'"
echo ""

# Keep script running and handle cleanup
trap 'echo ""; echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ Servers stopped"; exit 0' INT

# Wait for user interrupt
wait
