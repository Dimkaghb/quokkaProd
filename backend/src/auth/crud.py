from .utils import get_password_hash, verify_password
from .database import get_database
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

# In-memory storage for development
_users_storage = {}

async def get_user_by_email(email: str):
    """Get user by email from MongoDB or in-memory storage"""
    db = get_database()
    
    if db.mongodb_connected:
        try:
            user = await db.users_collection.find_one({"email": email})
            return user
        except Exception as e:
            logger.error(f"Error querying MongoDB: {e}")
            # Fall back to in-memory storage
            pass
    
    # In-memory storage fallback
    for user_id, user in db.in_memory_users.items():
        if user["email"] == email:
            return user
    return None

async def create_user(user):
    """Create a new user in MongoDB or in-memory storage"""
    db = get_database()
    
    # Check if user already exists
    existing_user = await get_user_by_email(user.email)
    if existing_user:
        return None
    
    # Create new user
    user_id = str(uuid.uuid4())
    user_dict = {
        "_id": user_id,
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "hashed_password": get_password_hash(user.password),
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    if db.mongodb_connected:
        try:
            await db.users_collection.insert_one(user_dict)
            logger.info(f"User {user.email} created in MongoDB")
            return user_dict
        except Exception as e:
            logger.error(f"Error inserting user to MongoDB: {e}")
            # Fall back to in-memory storage
            pass
    
    # In-memory storage fallback
    db.in_memory_users[user_id] = user_dict
    logger.info(f"User {user.email} created in memory storage")
    return user_dict

async def authenticate_user(email: str, password: str):
    """Authenticate user by email and password"""
    user = await get_user_by_email(email)
    if not user:
        return False
    
    if not verify_password(password, user["hashed_password"]):
        return False
    
    return user

async def update_user_profile(email: str, name: str):
    """Update user profile information"""
    db = get_database()
    
    if db.mongodb_connected:
        try:
            # Update in MongoDB
            result = await db.users_collection.update_one(
                {"email": email},
                {"$set": {"name": name}}
            )
            if result.modified_count > 0:
                # Return updated user
                updated_user = await db.users_collection.find_one({"email": email})
                logger.info(f"User {email} profile updated in MongoDB")
                return updated_user
        except Exception as e:
            logger.error(f"Error updating user profile in MongoDB: {e}")
            # Fall back to in-memory storage
            pass
    
    # In-memory storage fallback
    for user_id, user in db.in_memory_users.items():
        if user["email"] == email:
            user["name"] = name
            logger.info(f"User {email} profile updated in memory storage")
            return user
    
    return None
