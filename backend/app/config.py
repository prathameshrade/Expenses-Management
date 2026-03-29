"""Application Configuration"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Database
    database_url: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:root123@localhost:3306/expense_management"
    )
    
    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = 30
    
    # Google Vision
    google_credentials_path: Optional[str] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    # APIs
    restcountries_api: str = "https://restcountries.com/v3.1/all"
    exchangerate_api: str = "https://api.exchangerate-api.com/v4/latest"
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore frontend variables in .env

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()