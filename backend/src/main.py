from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import auth components, provide fallbacks if not available
try:
    from src.auth.api import router as auth_router
    from src.auth.database import connect_to_mongo, close_mongo_connection
    AUTH_AVAILABLE = True
except ImportError:
    logger.warning("Auth components not available, running without authentication")
    AUTH_AVAILABLE = False
    
    async def connect_to_mongo():
        """Fallback function when auth/database is not available."""
        logger.info("Database connection skipped (auth not available)")
        
    async def close_mongo_connection():
        """Fallback function when auth/database is not available."""
        logger.info("Database disconnection skipped (auth not available)")

# Import agents router
from src.data_analize.api import router as agents_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up application...")
    if AUTH_AVAILABLE:
        await connect_to_mongo()
        logger.info("✅ MongoDB Atlas connected successfully!")
    else:
        logger.info("⚠️ Running without database connection")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    if AUTH_AVAILABLE:
        await close_mongo_connection()

app = FastAPI(
    title="QuokkaAI API",
    description="Backend API for QuokkaAI intelligent data analysis assistant",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - must be added before including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
if AUTH_AVAILABLE:
    app.include_router(auth_router)
else:
    logger.warning("Auth router not included (auth components not available)")

app.include_router(agents_router)

# Mount static files for visualizations
visualization_dir = Path("data/visualizations")
visualization_dir.mkdir(parents=True, exist_ok=True)
app.mount("/visualizations", StaticFiles(directory=str(visualization_dir)), name="visualizations")

@app.get("/")
async def root():
    return {"message": "Welcome to QuokkaAI API - Intelligent Data Analysis Assistant"} 

@app.get("/healthz")
async def health_check():
    """Health endpoint for deployment checks."""
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)     