from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class SupportFormData(BaseModel):
    """Data model for support form submission."""
    email: EmailStr
    problem: str
    submitted_at: Optional[datetime] = None

class SupportFormResponse(BaseModel):
    """Response model for support form submission."""
    success: bool
    message: str