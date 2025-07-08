from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .utils import verify_token
from .crud import get_user_by_email
from .models import User
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Replace OAuth2PasswordBearer with HTTPBearer for better CORS handling
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        if not auth or not auth.credentials:
            logger.warning("No authorization credentials provided")
            raise credentials_exception
            
        token = auth.credentials
        logger.debug(f"Verifying token: {token[:20]}...")
        
        email = verify_token(token)
        if email is None:
            logger.warning("Token verification failed - invalid token")
            raise credentials_exception
            
        logger.debug(f"Token verified for email: {email}")
        user_dict = await get_user_by_email(email)
        if user_dict is None:
            logger.warning(f"User not found for email: {email}")
            raise credentials_exception
            
        # Convert dict to User object with better error handling
        try:
            # Handle both 'name' and 'full_name' fields (MongoDB compatibility)
            name = user_dict.get("name") or user_dict.get("full_name", "")
            
            user = User(
                id=user_dict.get("id") or str(user_dict.get("_id")),
                email=user_dict["email"],
                name=name,
                created_at=user_dict.get("created_at"),
                is_active=user_dict.get("is_active", True)
            )
            logger.debug(f"User object created successfully for: {email}")
            return user
        except Exception as e:
            logger.error(f"Error creating User object: {e}, user_dict: {user_dict}")
            raise credentials_exception
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {str(e)}")
        raise credentials_exception


async def get_current_user_optional(auth: Optional[HTTPAuthorizationCredentials] = Depends(optional_security)) -> Optional[User]:
    """Get current user but don't raise error if not authenticated."""
    if not auth or not auth.credentials:
        return None
    
    try:
        token = auth.credentials
        email = verify_token(token)
        if email is None:
            return None
            
        user_dict = await get_user_by_email(email)
        if user_dict is None:
            return None
            
        # Convert dict to User object
        user = User(
            id=user_dict.get("id") or str(user_dict.get("_id")),
            email=user_dict["email"],
            name=user_dict.get("name") or user_dict.get("full_name", ""),
            created_at=user_dict.get("created_at"),
            is_active=user_dict.get("is_active", True)
        )
        
        return user
    except Exception as e:
        logger.debug(f"Optional auth failed: {str(e)}")
        return None


