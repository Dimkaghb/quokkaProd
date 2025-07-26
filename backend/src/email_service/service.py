import os
import logging
import smtplib
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.message import EmailMessage
from pydantic import BaseModel, EmailStr
from jinja2 import Template
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailConfig:
    """Email configuration using the same settings as OTP service."""
    
    def __init__(self):
        # Use the same configuration as OTP service
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_username = "quokkaAIapp@gmail.com"
        self.smtp_password = "uiqm akkk ylbi aguw"
        self.smtp_use_tls = True
        self.system_email = os.getenv("SYSTEM_EMAIL", "info@quokkaai.site")
        self.from_email = "quokkaAIapp@gmail.com"
        
    def is_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.smtp_username and self.smtp_password)

class ContactFormData(BaseModel):
    """Data model for contact form submission."""
    name: str
    email: EmailStr
    company: Optional[str] = None
    phone: Optional[str] = None
    message: str
    submitted_at: Optional[datetime] = None

class EmailService:
    """Service for sending emails via SMTP."""
    
    def __init__(self):
        self.config = EmailConfig()
        
    def send_contact_form_email(self, form_data: ContactFormData) -> bool:
        """
        Send a structured email from the contact form data.
        Sends FROM the OTP system email TO info@quokkaai.site
        
        Args:
            form_data: The contact form data
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        if not self.config.is_configured():
            logger.error("Email service is not properly configured")
            return False
    
    def send_support_form_email(self, form_data) -> bool:
        """
        Send a support form email.
        Sends FROM the OTP system email TO info@quokkaai.site
        
        Args:
            form_data: The support form data (SupportFormData)
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        if not self.config.is_configured():
            logger.error("Email service is not properly configured")
            return False
            
        try:
            # Set submission time if not provided
            if not form_data.submitted_at:
                form_data.submitted_at = datetime.now()
            
            # Create email message
            msg = EmailMessage()
            msg['Subject'] = f"🆘 Support Request from {form_data.email}"
            msg['From'] = self.config.from_email  # quokkaAIapp@gmail.com (sender)
            msg['To'] = self.config.system_email  # info@quokkaai.site (recipient)
            msg['Reply-To'] = form_data.email     # User's email for easy reply
            
            # Create structured HTML email content
            html_content = self._create_support_html_email(form_data)
            msg.set_content(html_content, subtype='html')
            
            # Send email using the same method as OTP service
            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
                server.starttls()
                server.login(self.config.smtp_username, self.config.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Support form email sent successfully for {form_data.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send support form email: {str(e)}")
            return False
    
    def _create_support_html_email(self, form_data) -> str:
        """Create a structured HTML email template for support requests."""
        from datetime import datetime
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Support Request</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px; }
                .contact-info { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .info-row { display: flex; margin-bottom: 15px; align-items: center; }
                .info-label { font-weight: 600; color: #495057; min-width: 100px; margin-right: 15px; }
                .info-value { color: #212529; flex: 1; }
                .message-section { margin-top: 25px; }
                .message-content { background-color: #fff3cd; border-left: 4px solid #dc3545; padding: 20px; border-radius: 0 8px 8px 0; font-style: italic; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
                .timestamp { color: #6c757d; font-size: 12px; margin-top: 15px; }
                .priority-notice { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 15px; margin: 20px 0; color: #0c5460; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🆘 Support Request</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">QuokkaAI Customer Support</p>
                </div>
                
                <div class="content">
                    <div class="priority-notice">
                        <strong>⏰ Response Time:</strong> We aim to respond within 24 hours during business days.
                    </div>
                    
                    <div class="contact-info">
                        <div class="info-row">
                            <span class="info-label">📧 Email:</span>
                            <span class="info-value"><a href="mailto:{{ email }}" style="color: #dc3545; text-decoration: none;">{{ email }}</a></span>
                        </div>
                    </div>
                    
                    <div class="message-section">
                        <h3 style="color: #495057; margin-bottom: 15px;">🔧 Problem Description:</h3>
                        <div class="message-content">
                            {{ problem | replace('\n', '<br>') }}
                        </div>
                    </div>
                    
                    <div class="timestamp">
                        📅 Submitted: {{ timestamp }}
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>QuokkaAI Support Team</strong></p>
                    <p>This email was automatically generated from the support form.</p>
                    <p>Reply directly to this email to respond to the user.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        return template.render(
            email=form_data.email,
            problem=form_data.problem,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        )
    
    def _create_html_email(self, form_data: ContactFormData) -> str:
        """Create a structured HTML email template."""
        from datetime import datetime
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Enterprise Contact</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px; }
                .contact-info { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .info-row { display: flex; margin-bottom: 15px; align-items: center; }
                .info-label { font-weight: 600; color: #495057; min-width: 100px; margin-right: 15px; }
                .info-value { color: #212529; flex: 1; }
                .message-section { margin-top: 25px; }
                .message-content { background-color: #e9ecef; border-left: 4px solid #667eea; padding: 20px; border-radius: 0 8px 8px 0; font-style: italic; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
                .timestamp { color: #6c757d; font-size: 12px; margin-top: 15px; }
                .icon { margin-right: 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 New Enterprise Contact</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">QuokkaAI Enterprise Inquiry</p>
                </div>
                
                <div class="content">
                    <div class="contact-info">
                        <div class="info-row">
                            <span class="info-label">👤 Name:</span>
                            <span class="info-value"><strong>{{ name }}</strong></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">📧 Email:</span>
                            <span class="info-value"><a href="mailto:{{ email }}" style="color: #667eea; text-decoration: none;">{{ email }}</a></span>
                        </div>
                        {% if company %}
                        <div class="info-row">
                            <span class="info-label">🏢 Company:</span>
                            <span class="info-value">{{ company }}</span>
                        </div>
                        {% endif %}
                        {% if phone %}
                        <div class="info-row">
                            <span class="info-label">📞 Phone:</span>
                            <span class="info-value"><a href="tel:{{ phone }}" style="color: #667eea; text-decoration: none;">{{ phone }}</a></span>
                        </div>
                        {% endif %}
                    </div>
                    
                    <div class="message-section">
                        <h3 style="color: #495057; margin-bottom: 15px;">💬 Message:</h3>
                        <div class="message-content">
                            {{ message | replace('\n', '<br>') }}
                        </div>
                    </div>
                    
                    <div class="timestamp">
                        📅 Submitted: {{ timestamp }}
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>QuokkaAI Enterprise Team</strong></p>
                    <p>This email was automatically generated from the enterprise contact form.</p>
                    <p>Reply directly to this email to respond to {{ name }}.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        return template.render(
            name=form_data.name,
            email=form_data.email,
            company=form_data.company or "Not provided",
            phone=form_data.phone or "Not provided",
            message=form_data.message,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        )
    
    def _create_text_email(self, form_data: ContactFormData) -> str:
        """Create plain text email template."""
        from datetime import datetime
        
        text_content = f"""
New Enterprise Contact - QuokkaAI

Contact Information:
-------------------
Name: {form_data.name}
Email: {form_data.email}
Company: {form_data.company or "Not provided"}
Phone: {form_data.phone or "Not provided"}

Message:
--------
{form_data.message}

---
Submitted: {datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}

This email was automatically generated from the enterprise contact form.
Reply directly to this email to respond to {form_data.name}.

QuokkaAI Enterprise Team
        """
        return text_content.strip()
    


# Global email service instance
email_service = EmailService()