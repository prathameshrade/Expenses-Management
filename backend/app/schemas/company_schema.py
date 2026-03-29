"""
Company schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CompanyBase(BaseModel):
    """Base company schema"""
    name: str = Field(..., min_length=1, max_length=255)
    country: str = Field(..., min_length=2, max_length=100)
    currency: str = Field(..., min_length=3, max_length=3)


class CompanyCreate(CompanyBase):
    """Company creation schema"""
    class Config:
        json_schema_extra = {
            "example": {
                "name": "TechCorp Inc",
                "country": "US",
                "currency": "USD"
            }
        }


class CompanyResponse(CompanyBase):
    """Company response schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "TechCorp Inc",
                "country": "US",
                "currency": "USD",
                "created_at": "2024-01-15T10:00:00",
                "updated_at": "2024-01-15T10:00:00"
            }
        }