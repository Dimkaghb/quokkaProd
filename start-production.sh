#!/bin/bash

# Production Environment Setup Script
# This script helps manage environment variables for Docker Compose in production

echo "🚀 QuokkaAI Production Environment Setup"
echo "========================================"

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo "❌ Root .env file not found!"
    echo "Please create a .env file in the root directory with production environment variables."
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo "❌ Frontend .env file not found!"
    echo "Please create a .env file in the frontend directory with frontend-specific variables."
    exit 1
fi

if [ ! -f "backend/.env" ]; then
    echo "❌ Backend .env file not found!"
    echo "Please create a .env file in the backend directory with backend-specific variables."
    exit 1
fi

echo "✅ All .env files found"

# Load environment variables from root .env for Docker Compose
export $(grep -v '^#' .env | xargs)

echo "📋 Environment Configuration:"
echo "   - Frontend: Uses frontend/.env for build-time variables"
echo "   - Backend: Uses backend/.env + root/.env for runtime variables"
echo "   - Docker Compose: Uses root/.env for service configuration"

echo ""
echo "🐳 Starting Docker Compose..."
docker-compose up -d

echo ""
echo "✅ Production environment started!"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:8000"
echo "   - MongoDB: localhost:27017"