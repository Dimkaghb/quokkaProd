import random
import smtplib
import logging
from email.message import EmailMessage
from datetime import datetime, timedelta
from typing import Optional
from .settings import settings

logger = logging.getLogger(__name__)

class OTPService:
    """Service for OTP generation, sending and verification"""
    
    def __init__(self):
        self.smtp_server = 'smtp.gmail.com'
        self.smtp_port = 587
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', 'quokkaAIapp@gmail.com')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', 'uiqm akkk ylbi aguw')
        self.from_email = getattr(settings, 'FROM_EMAIL', 'quokkaAIapp@gmail.com')
    
    def generate_otp(self, length: int = 6) -> str:
        """Generate a random OTP code"""
        return ''.join([str(random.randint(0, 9)) for _ in range(length)])
    
    async def send_otp_email(self, email: str, otp_code: str) -> bool:
        """Send OTP code via email"""
        try:
            # Create email message
            msg = EmailMessage()
            msg['Subject'] = "QuokkaAI - Email Verification Code"
            msg['From'] = self.from_email
            msg['To'] = email
            
            # Email content
            content = f"""
            Hello!
            
            Your email verification code is: {otp_code}
            
            This code will expire in 1 minute.
            
            If you didn't request this code, please ignore this email.
            
            Best regards,
            QuokkaAI Team
            """
            
            msg.set_content(content)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"OTP email sent successfully to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send OTP email to {email}: {str(e)}")
            return False
    
    def is_otp_expired(self, created_at: datetime, expiry_minutes: int = 1) -> bool:
        """Check if OTP has expired"""
        expiry_time = created_at + timedelta(minutes=expiry_minutes)
        return datetime.utcnow() > expiry_time

# Global OTP service instance
otp_service = OTPService() 