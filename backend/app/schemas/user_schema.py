"""
User schemas for request/response validation
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    role: UserRole = Field(default=UserRole.EMPLOYEE)


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8, max_length=255)
    country: Optional[str] = Field(None, max_length=100)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "name": "John Doe",
                "password": "SecurePassword123",
                "role": "employee",
                "country": "US"
            }
        }


class UserUpdate(BaseModel):
    """User update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=8, max_length=255)
    manager_id: Optional[int] = None
    is_manager_approver: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Updated Name",
                "password": "NewPassword123"
            }
        }


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    email: str
    name: str
    role: UserRole
    company_id: int
    manager_id: Optional[int] = None
    is_active: bool = True
    is_manager_approver: bool = False
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "name": "John Doe",
                "role": "employee",
                "company_id": 1,
                "manager_id": None,
                "is_active": True,
                "is_manager_approver": False,
                "created_at": "2024-01-15T10:00:00",
                "updated_at": "2024-01-15T10:00:00"
            }
        }


class UserListResponse(BaseModel):
    """User list response"""
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    
    class Config:
        from_attributes = True