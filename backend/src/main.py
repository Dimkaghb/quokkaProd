from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import auth_router
from auth.database import connect_to_mongo, close_mongo_connection
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up application...")
    await connect_to_mongo()
    logger.info("✅ MongoDB Atlas connected successfully!")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    await close_mongo_connection()

app = FastAPI(
    title="QuokkaAI API",
    description="Backend API for QuokkaAI application",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend development server
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://127.0.0.1:5173"   # Alternative localhost
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "Welcome to QuokkaAI API"} 


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)     