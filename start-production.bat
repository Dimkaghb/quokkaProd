@echo off
REM Production Environment Setup Script for Windows
REM This script helps manage environment variables for Docker Compose in production

echo 🚀 QuokkaAI Production Environment Setup
echo ========================================

REM Check if .env files exist
if not exist ".env" (
    echo ❌ Root .env file not found!
    echo Please create a .env file in the root directory with production environment variables.
    exit /b 1
)

if not exist "frontend\.env" (
    echo ❌ Frontend .env file not found!
    echo Please create a .env file in the frontend directory with frontend-specific variables.
    exit /b 1
)

if not exist "backend\.env" (
    echo ❌ Backend .env file not found!
    echo Please create a .env file in the backend directory with backend-specific variables.
    exit /b 1
)

echo ✅ All .env files found

echo 📋 Environment Configuration:
echo    - Frontend: Uses frontend/.env for build-time variables
echo    - Backend: Uses backend/.env + root/.env for runtime variables
echo    - Docker Compose: Uses root/.env for service configuration

echo.
echo 🐳 Starting Docker Compose...
docker-compose up -d

echo.
echo ✅ Production environment started!
echo    - Frontend: http://localhost:3000
echo    - Backend: http://localhost:8000
echo    - MongoDB: localhost:27017