from fastapi import APIRouter, Depends, HTTPException, status
from .models import UserCreate, User, Token
from .crud import create_user, authenticate_user
from .utils import create_access_token
from .dependencies import get_current_user
from datetime import timedelta
from pydantic import BaseModel

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
    db_user = await create_user(user)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return {
        "id": db_user["id"],
        "name": db_user["name"],
        "email": db_user["email"],
        "created_at": db_user["created_at"].isoformat(),
        "is_active": db_user["is_active"]
    }

@router.post("/login")
async def login(login_data: LoginRequest):
    user = await authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user information from token.
    
    Args:
        current_user: Current authenticated user from token
        
    Returns:
        User information
    """
    return UserResponse(
        id=str(current_user["id"]),
        name=current_user["name"],
        email=current_user["email"],
        created_at=current_user["created_at"].isoformat() if current_user.get("created_at") else ""
    )
