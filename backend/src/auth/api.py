from fastapi import APIRouter, Depends, HTTPException, status
from .models import UserCreate, User, Token, OTPRequest, OTPVerify, OTPResponse, RegistrationResponse
from .crud import create_user, authenticate_user, update_user_profile, create_otp_record, verify_and_delete_otp
from .utils import create_access_token
from .dependencies import get_current_user
from .otp_service import otp_service
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

class UpdateProfileRequest(BaseModel):
    name: str

@router.post("/request-otp", response_model=OTPResponse)
async def request_otp(otp_request: OTPRequest):
    """
    Request OTP for email verification during registration
    """
    try:
        logger.info(f"OTP request for email: {otp_request.email}")
        
        # Check if user already exists
        from .crud import get_user_by_email
        existing_user = await get_user_by_email(otp_request.email)
        if existing_user:
            logger.warning(f"OTP request failed - email already registered: {otp_request.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Generate OTP
        otp_code = otp_service.generate_otp()
        
        # Prepare user data for later creation
        user_data = {
            "name": otp_request.name,
            "email": otp_request.email,
            "password": otp_request.password
        }
        
        # Store OTP in database
        await create_otp_record(otp_request.email, otp_code, user_data)
        
        # Send OTP via email
        email_sent = await otp_service.send_otp_email(otp_request.email, otp_code)
        
        if not email_sent:
            logger.error(f"Failed to send OTP email to {otp_request.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification email"
            )
        
        logger.info(f"OTP sent successfully to {otp_request.email}")
        return OTPResponse(
            message="Verification code sent to your email",
            email=otp_request.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP request error for {otp_request.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification code: {str(e)}"
        )

@router.post("/verify-otp", response_model=RegistrationResponse)
async def verify_otp(otp_verify: OTPVerify):
    """
    Verify OTP and create user account
    """
    try:
        logger.info(f"OTP verification attempt for email: {otp_verify.email}")
        
        # Verify OTP and get user data
        user_data = await verify_and_delete_otp(otp_verify.email, otp_verify.otp_code)
        
        if not user_data:
            logger.warning(f"Invalid OTP for email: {otp_verify.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code"
            )
        
        # Create user from verified data
        user_create = UserCreate(
            name=user_data["name"],
            email=user_data["email"],
            password=user_data["password"]
        )
        
        db_user = await create_user(user_create)
        
        if not db_user:
            logger.error(f"Failed to create user after OTP verification: {otp_verify.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )
        
        logger.info(f"User created successfully after OTP verification: {otp_verify.email}")
        
        # Format response
        created_at_str = ""
        if db_user.get("created_at"):
            if hasattr(db_user["created_at"], 'isoformat'):
                created_at_str = db_user["created_at"].isoformat()
            else:
                created_at_str = str(db_user["created_at"])
        
        user_response = User(
            id=str(db_user.get("id") or db_user.get("_id")),
            name=db_user.get("name", ""),
            email=db_user.get("email", ""),
            created_at=db_user.get("created_at"),
            is_active=db_user.get("is_active", True)
        )
        
        return RegistrationResponse(
            message="Account created successfully",
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error for {otp_verify.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )

@router.post("/signup")
async def signup(user: UserCreate):
    """
    Legacy signup endpoint - now redirects to OTP flow
    """
    try:
        logger.info(f"Legacy signup attempt for email: {user.email}")
        
        # Check if user already exists
        from .crud import get_user_by_email
        existing_user = await get_user_by_email(user.email)
        if existing_user:
            logger.warning(f"Legacy signup failed - email already registered: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please use the OTP verification flow."
            )
        
        # Redirect to OTP flow
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use /auth/request-otp endpoint for registration with email verification"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Legacy signup error for {user.email}: {str(e)}")
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

@router.put("/profile")
async def update_profile(
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Update user profile information.
    
    Args:
        profile_data: Profile data to update
        current_user: Current authenticated user
        
    Returns:
        Updated user information
    """
    try:
        logger.info(f"Updating profile for user: {current_user.email}")
        
        # Update user profile in database
        updated_user = await update_user_profile(current_user.email, profile_data.name)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Format created_at properly
        created_at_str = ""
        if updated_user.get("created_at"):
            if hasattr(updated_user["created_at"], 'isoformat'):
                created_at_str = updated_user["created_at"].isoformat()
            else:
                created_at_str = str(updated_user["created_at"])
        
        return UserResponse(
            id=str(updated_user.get("id") or updated_user.get("_id")),
            name=updated_user.get("name", ""),
            email=updated_user.get("email", ""),
            created_at=created_at_str
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )

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
