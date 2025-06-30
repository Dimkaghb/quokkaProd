from fastapi import APIRouter, Depends, HTTPException, status
from .models import UserCreate, User, Token
from .crud import create_user, authenticate_user
from .utils import create_access_token
from .dependencies import get_current_user
from datetime import timedelta
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str

@router.post("/signup")
async def signup(user: UserCreate):
    try:
        logger.info(f"Signup attempt for email: {user.email}")
        db_user = await create_user(user)
        if db_user is None:
            logger.warning(f"Signup failed - email already registered: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        logger.info(f"Successful signup for email: {user.email}")
        created_at_str = ""
        if db_user.get("created_at"):
            if hasattr(db_user["created_at"], 'isoformat'):
                created_at_str = db_user["created_at"].isoformat()
            else:
                created_at_str = str(db_user["created_at"])
        
        return {
            "id": str(db_user.get("id") or db_user.get("_id")),
            "name": db_user.get("name", ""),
            "email": db_user.get("email", ""),
            "created_at": created_at_str,
            "is_active": db_user.get("is_active", True)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error for {user.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )

@router.post("/login")
async def login(login_data: LoginRequest):
    try:
        logger.info(f"Login attempt for email: {login_data.email}")
        user = await authenticate_user(login_data.email, login_data.password)
        if not user:
            logger.warning(f"Failed login attempt for email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create access token with user email
        access_token = create_access_token(data={"sub": user["email"]})
        logger.info(f"Successful login for email: {login_data.email}")
        
        try:
            user_info = {
                "id": str(user.get("id") or user.get("_id", "")),
                "name": user.get("name", ""),
                "email": user.get("email", "")
            }
            
            user_response = {
                "access_token": access_token, 
                "token_type": "bearer",
                "user": user_info
            }
            
            logger.debug(f"Login response: {user_response}")
            return user_response
        except Exception as e:
            logger.error(f"Error creating user response: {e}")
            # Return minimal response if user serialization fails
            return {
                "access_token": access_token, 
                "token_type": "bearer"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.options("/me")
async def options_me():
    """Handle preflight OPTIONS request for /me endpoint"""
    return {"message": "OK"}

@router.get("/test-auth")
async def test_auth(current_user: User = Depends(get_current_user)):
    """Simple test endpoint to verify authentication is working."""
    return {
        "message": "Authentication successful",
        "user_id": current_user.id,
        "user_email": current_user.email,
        "user_name": current_user.name
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information from token.
    
    Args:
        current_user: Current authenticated user from token
        
    Returns:
        User information
    """
    try:
        logger.info(f"Getting user info for: {current_user.email}")
        
        # Ensure we have required fields
        if not current_user.id or not current_user.email:
            logger.error(f"Invalid user object: id={current_user.id}, email={current_user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user data"
            )
        
        # Format created_at properly
        created_at_str = ""
        if current_user.created_at:
            if hasattr(current_user.created_at, 'isoformat'):
                created_at_str = current_user.created_at.isoformat()
            else:
                created_at_str = str(current_user.created_at)
        
        return UserResponse(
            id=str(current_user.id),
            name=current_user.name,
            email=current_user.email,
            created_at=created_at_str
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user information: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user information: {str(e)}"
        )
