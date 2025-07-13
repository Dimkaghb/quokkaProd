from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# OTP Models
class OTPRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: str

class OTPResponse(BaseModel):
    message: str
    email: str

class RegistrationResponse(BaseModel):
    message: str
    user: User
