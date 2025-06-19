import os
from pydantic_settings import BaseSettings

import dotenv   

# Load environment variables from .env file
dotenv.load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "")
    DATABASE_NAME: str = "quokka_db"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate that required environment variables are set
        if not self.MONGODB_URL:
            print("⚠️  WARNING: MONGODB_URL not found in environment variables!")
        if self.MONGODB_URL:
            print(f"✅ MONGODB_URL loaded: {self.MONGODB_URL[:50]}...")

settings = Settings() 