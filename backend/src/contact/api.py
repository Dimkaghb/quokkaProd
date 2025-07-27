from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import logging
from datetime import datetime

from src.email_service.service import email_service, ContactFormData
from .support_models import SupportFormData, SupportFormResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])

class ContactFormRequest(BaseModel):
    """Request model for contact form submission."""
    name: str
    email: EmailStr
    company: Optional[str] = None
    phone: Optional[str] = None
    message: str
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('message')
    def validate_message(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Message must be at least 10 characters long')
        return v.strip()
    
    @validator('phone')
    def validate_phone(cls, v):
        if v and len(v.strip()) < 5:
            raise ValueError('Phone number must be at least 5 characters long')
        return v.strip() if v else None
    
    @validator('company')
    def validate_company(cls, v):
        return v.strip() if v else None

class ContactFormResponse(BaseModel):
    """Response model for contact form submission."""
    success: bool
    message: str
    timestamp: datetime

@router.post("/enterprise", response_model=ContactFormResponse)
async def submit_enterprise_contact(form_data: ContactFormRequest):
    """
    Submit enterprise contact form and send email notification.
    
    This endpoint:
    1. Validates the contact form data
    2. Structures the information professionally
    3. Sends an email to the system email address
    4. Returns success/failure status
    """
    try:
        logger.info(f"Received enterprise contact form submission from {form_data.email}")
        
        # Create contact form data with timestamp
        contact_data = ContactFormData(
            name=form_data.name,
            email=form_data.email,
            company=form_data.company,
            phone=form_data.phone,
            message=form_data.message,
            submitted_at=datetime.now()
        )
        
        # Send email
        email_sent = email_service.send_contact_form_email(contact_data)
        
        if email_sent:
            logger.info(f"Enterprise contact email sent successfully for {form_data.email}")
            return ContactFormResponse(
                success=True,
                message="Your message has been sent successfully! We'll get back to you soon.",
                timestamp=contact_data.submitted_at
            )
        else:
            logger.error(f"Failed to send enterprise contact email for {form_data.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email. Please try again later."
            )
            
    except ValueError as e:
        logger.warning(f"Validation error in contact form: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in contact form submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )

@router.post("/support", response_model=SupportFormResponse)
async def submit_support_form(form_data: SupportFormData):
    """
    Submit support form and send email notification.
    
    This endpoint:
    1. Validates the support form data
    2. Sends an email to the system email address
    3. Returns success/failure status
    """
    try:
        logger.info(f"Received support form submission from {form_data.email}")
        
        # Add timestamp
        form_data.submitted_at = datetime.now()
        
        # Send support email
        email_sent = email_service.send_support_form_email(form_data)
        
        if email_sent:
            logger.info(f"Support email sent successfully for {form_data.email}")
            return SupportFormResponse(
                success=True,
                message="Your support request has been sent successfully! We'll respond within 24 hours."
            )
        else:
            logger.error(f"Failed to send support email for {form_data.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email. Please try again later."
            )
            
    except ValueError as e:
        logger.warning(f"Validation error in support form: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in support form submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )

@router.get("/health")
async def contact_health_check():
    """Health check endpoint for contact service."""
    email_configured = email_service.config.is_configured()
    
    return {
        "status": "ok",
        "email_configured": email_configured,
        "timestamp": datetime.now()
    }