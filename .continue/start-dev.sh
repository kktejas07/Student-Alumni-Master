#!/bin/bash
# Start development environment for Continue
# This script starts MongoDB + Backend via Docker, then Frontend locally

set -e

echo "🚀 Starting Student Alumni development environment..."

# Start MongoDB and Backend via Docker Compose
echo "📦 Starting MongoDB and Backend (Docker)..."
docker compose -f docker-compose.dev.yml up -d --wait

echo "✅ Backend started at http://localhost:8001"
echo "   API Docs: http://localhost:8001/docs"
echo "   Health: http://localhost:8001/api/health"

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  Frontend dependencies not installed. Run the install command first."
    echo "   Or run: cd frontend && yarn install"
    exit 1
fi

# Start Frontend
echo "🎨 Starting Frontend (local)..."
cd frontend
export EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
yarn start --web --port 8081 &
FRONTEND_PID=$!

echo "✅ Frontend started at http://localhost:8081"
echo ""
echo "📋 Services running:"
echo "   • MongoDB:  localhost:27017"
echo "   • Backend:  http://localhost:8001"
echo "   • Frontend: http://localhost:8081"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for frontend process
wait $FRONTEND_PID

# Cleanup on exit
echo "🛑 Stopping services..."
docker compose -f ../docker-compose.dev.yml down
