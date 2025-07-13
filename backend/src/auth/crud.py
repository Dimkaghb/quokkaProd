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

# OTP CRUD Operations
async def create_otp_record(email: str, otp_code: str, user_data: dict):
    """Create OTP record in database"""
    db = get_database()
    
    otp_id = str(uuid.uuid4())
    otp_record = {
        "_id": otp_id,
        "id": otp_id,
        "email": email,
        "otp_code": otp_code,
        "user_data": user_data,
        "created_at": datetime.utcnow(),
        "is_verified": False
    }
    
    if db.mongodb_connected:
        try:
            # Remove any existing OTP for this email
            await db.otp_collection.delete_many({"email": email})
            # Insert new OTP record
            await db.otp_collection.insert_one(otp_record)
            logger.info(f"OTP record created for {email} in MongoDB")
            return otp_record
        except Exception as e:
            logger.error(f"Error creating OTP record in MongoDB: {e}")
            # Fall back to in-memory storage
            pass
    
    # In-memory storage fallback
    db.in_memory_otps[otp_id] = otp_record
    logger.info(f"OTP record created for {email} in memory storage")
    return otp_record

async def get_otp_record(email: str):
    """Get OTP record by email"""
    db = get_database()
    
    if db.mongodb_connected:
        try:
            otp_record = await db.otp_collection.find_one({"email": email})
            return otp_record
        except Exception as e:
            logger.error(f"Error querying OTP from MongoDB: {e}")
            # Fall back to in-memory storage
            pass
    
    # In-memory storage fallback
    for otp_id, otp_record in db.in_memory_otps.items():
        if otp_record["email"] == email:
            return otp_record
    return None

async def verify_and_delete_otp(email: str, otp_code: str):
    """Verify OTP and return user data if valid"""
    db = get_database()
    
    otp_record = await get_otp_record(email)
    if not otp_record:
        return None
    
    # Check if OTP matches
    if otp_record["otp_code"] != otp_code:
        return None
    
    # Check if OTP is expired (1 minute)
    from datetime import timedelta
    expiry_time = otp_record["created_at"] + timedelta(minutes=1)
    if datetime.utcnow() > expiry_time:
        # Delete expired OTP
        await delete_otp_record(email)
        return None
    
    # Get user data
    user_data = otp_record["user_data"]
    
    # Delete OTP record after successful verification
    await delete_otp_record(email)
    
    return user_data

async def delete_otp_record(email: str):
    """Delete OTP record by email"""
    db = get_database()
    
    if db.mongodb_connected:
        try:
            await db.otp_collection.delete_many({"email": email})
            logger.info(f"OTP record deleted for {email} from MongoDB")
        except Exception as e:
            logger.error(f"Error deleting OTP record from MongoDB: {e}")
            # Fall back to in-memory storage
            pass
    
    # In-memory storage fallback
    otp_ids_to_delete = []
    for otp_id, otp_record in db.in_memory_otps.items():
        if otp_record["email"] == email:
            otp_ids_to_delete.append(otp_id)
    
    for otp_id in otp_ids_to_delete:
        del db.in_memory_otps[otp_id]
    
    if otp_ids_to_delete:
        logger.info(f"OTP record deleted for {email} from memory storage")
