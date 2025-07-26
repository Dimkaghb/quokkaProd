from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
from pathlib import Path
import time

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

# Import data cleaning router
try:
    from src.data_cleaning.api import router as data_cleaning_router
    DATA_CLEANING_AVAILABLE = True
    logger.info("✅ Data cleaning module loaded successfully")
except ImportError as e:
    logger.warning(f"Data cleaning module not available: {e}")
    DATA_CLEANING_AVAILABLE = False

# Import new module routers (documents and chat)
try:
    from src.documents.api import router as documents_router
    from src.chat.api import router as chat_router
    NEW_MODULES_AVAILABLE = True
    logger.info("✅ New modules (documents, chat) loaded successfully")
except ImportError as e:
    logger.warning(f"New modules not available: {e}")
    NEW_MODULES_AVAILABLE = False

# Import data report router
try:
    from src.data_report.api import router as data_report_router
    DATA_REPORT_AVAILABLE = True
    logger.info("✅ Data report module loaded successfully")
except ImportError as e:
    logger.warning(f"Data report module not available: {e}")
    DATA_REPORT_AVAILABLE = False

# Import contact router
try:
    from src.contact.api import router as contact_router
    CONTACT_AVAILABLE = True
    logger.info("✅ Contact module loaded successfully")
except ImportError as e:
    logger.warning(f"Contact module not available: {e}")
    CONTACT_AVAILABLE = False

# Import graphs router
try:
    from src.graphs.api import router as graphs_router
    GRAPHS_AVAILABLE = True
    logger.info("✅ Graphs module loaded successfully")
except ImportError as e:
    logger.warning(f"Graphs module not available: {e}")
    GRAPHS_AVAILABLE = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up application...")
    
    # Validate file system setup
    try:
        from src.utils.startup_validation import log_validation_results
        log_validation_results()
    except Exception as e:
        logger.warning(f"Could not run startup validation: {e}")
    
    if AUTH_AVAILABLE:
        await connect_to_mongo()
        logger.info("✅ MongoDB Atlas connected successfully!")
    else:
        logger.info("⚠️ Running without database connection")
    
    # Initialize thread agent manager if available
    if NEW_MODULES_AVAILABLE:
        try:
            from src.chat.agent_manager import get_thread_agent_manager
            agent_manager = get_thread_agent_manager()
            logger.info("✅ Thread Agent Manager initialized")
        except Exception as e:
            logger.warning(f"Could not initialize Thread Agent Manager: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    
    # Graceful shutdown of thread agent manager
    if NEW_MODULES_AVAILABLE:
        try:
            from src.chat.agent_manager import get_thread_agent_manager
            agent_manager = get_thread_agent_manager()
            await agent_manager.shutdown()
            logger.info("✅ Thread Agent Manager shutdown completed")
        except Exception as e:
            logger.warning(f"Error during agent manager shutdown: {e}")
    
    if AUTH_AVAILABLE:
        await close_mongo_connection()

app = FastAPI(
    title="QuokkaAI API",
    description="Backend API for QuokkaAI intelligent data analysis assistant",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/check/docs",
    redoc_url="/check/redoc"
)

# Add request logging middleware for debugging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"🔍 Incoming request: {request.method} {request.url.path}")
    logger.info(f"🔍 Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(f"🔍 Response: {response.status_code} - Time: {process_time:.3f}s")
    return response

# Configure CORS - must be added before including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://quokkaai.site",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers with /api prefix for production
if AUTH_AVAILABLE:
    app.include_router(auth_router)
else:
    logger.warning("Auth router not included (auth components not available)")

app.include_router(agents_router)

# Include data cleaning router
if DATA_CLEANING_AVAILABLE:
    app.include_router(data_cleaning_router)
    logger.info("✅ Data cleaning router included")
else:
    logger.warning("Data cleaning router not included")

# Include new module routers
if NEW_MODULES_AVAILABLE:
    app.include_router(documents_router)
    app.include_router(chat_router)
    logger.info("✅ New module routers (documents, chat) included")
else:
    logger.warning("New module routers not included")

# Include data report router
if DATA_REPORT_AVAILABLE:
    app.include_router(data_report_router)
    logger.info("✅ Data report router included")
else:
    logger.warning("Data report router not included")

# Include contact router
if CONTACT_AVAILABLE:
    app.include_router(contact_router)
    logger.info("✅ Contact router included")
else:
    logger.warning("Contact router not included")

# Include graphs router
if GRAPHS_AVAILABLE:
    app.include_router(graphs_router)
    logger.info("✅ Graphs router included")
else:
    logger.warning("Graphs router not included")

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

@app.get("/test")
async def test_endpoint():
    """Test endpoint to check routing."""
    return {"message": "Test endpoint working", "endpoints": "available"}

@app.get("/api/test")
async def api_test_endpoint():
    """Test endpoint with /api prefix."""
    return {"message": "API test endpoint working"}

@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to show all available routes."""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": getattr(route, 'name', None)
            })
    return {
        "message": "Available routes", 
        "routes": routes,
        "auth_available": AUTH_AVAILABLE,
        "new_modules_available": NEW_MODULES_AVAILABLE
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)