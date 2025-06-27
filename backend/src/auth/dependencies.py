from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .utils import verify_token
from .crud import get_user_by_email
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Replace OAuth2PasswordBearer with HTTPBearer for better CORS handling
security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = auth.credentials
        email = verify_token(token)
        if email is None:
            raise credentials_exception
            
        user = await get_user_by_email(email)
        if user is None:
            raise credentials_exception
            
        return user
    except Exception:
        raise credentials_exception


