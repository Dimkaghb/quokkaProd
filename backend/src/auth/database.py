from motor.motor_asyncio import AsyncIOMotorClient
from .settings import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None
    users_collection = None
    mongodb_connected = False
    
    # In-memory storage for development when MongoDB is not available
    in_memory_users = {}

database = Database()

async def connect_to_mongo():
    """Create database connection to MongoDB Atlas"""
    try:
        logger.info("Attempting to connect to MongoDB Atlas...")
        
        # Check if MONGODB_URL is loaded
        if not settings.MONGODB_URL:
            raise Exception("MONGODB_URL not found in environment variables")
        
        logger.info(f"Connecting to: {settings.MONGODB_URL[:50]}...")  # Log first 50 chars for debugging
        
        database.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            maxPoolSize=10,
            retryWrites=True
        )
        
        database.db = database.client[settings.DATABASE_NAME]
        database.users_collection = database.db.users
        
        # Test the connection
        await database.client.admin.command('ping')
        logger.info("✅ Successfully connected to MongoDB Atlas!")
        
        # Test database operations
        try:
            # Try to count documents to verify we can perform operations
            count = await database.users_collection.count_documents({})
            logger.info(f"✅ MongoDB Atlas operations working! Found {count} users in database.")
            database.mongodb_connected = True
        except Exception as op_error:
            logger.error(f"❌ MongoDB operations failed: {op_error}")
            database.mongodb_connected = False
            
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB Atlas: {e}")
        logger.warning("Application will continue with in-memory storage for development")
        database.mongodb_connected = False

async def close_mongo_connection():
    """Close database connection"""
    if database.mongodb_connected and database.client:
        database.client.close()
        logger.info("MongoDB connection closed")

def get_database():
    return database
