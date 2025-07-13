import os
from pydantic_settings import BaseSettings

import dotenv   

# Load environment variables from .env file
dotenv.load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str
    DATABASE_NAME: str = "quokka_db"
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # SMTP Settings for OTP
    SMTP_USERNAME: str = "quokkaAIapp@gmail.com"
    SMTP_PASSWORD: str = "uiqm akkk ylbi aguw"
    FROM_EMAIL: str = "quokkaAIapp@gmail.com"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings() 