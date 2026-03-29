"""
Expense schemas for request/response validation
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from decimal import Decimal


class ExpenseCategory(str, Enum):
    """Expense category enumeration"""
    FOOD = "food"
    TRAVEL = "travel"
    ACCOMMODATION = "accommodation"
    MISCELLANEOUS = "miscellaneous"


class ExpenseStatus(str, Enum):
    """Expense status enumeration"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class ExpenseBase(BaseModel):
    """Base expense schema"""
    category: ExpenseCategory
    description: str = Field(..., min_length=1, max_length=1000)
    amount: Decimal = Field(..., gt=0)  # Removed decimal_places
    currency: str = Field(..., min_length=3, max_length=3)
    expense_date: datetime


class ExpenseCreate(ExpenseBase):
    """Expense creation schema"""
    receipt_url: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "food",
                "description": "Team lunch at restaurant",
                "amount": 50.00,
                "currency": "USD",
                "expense_date": "2024-01-15T12:00:00",
                "receipt_url": "/uploads/receipt.jpg"
            }
        }


class ExpenseUpdate(BaseModel):
    """Expense update schema"""
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    amount: Optional[Decimal] = Field(None, gt=0)  # Removed decimal_places
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    expense_date: Optional[datetime] = None
    receipt_url: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "description": "Updated description",
                "amount": 55.00
            }
        }


class ExpenseResponse(BaseModel):
    """Expense response schema"""
    id: int
    employee_id: int
    company_id: int
    category: ExpenseCategory
    description: str
    amount: Decimal
    currency: str
    amount_in_base_currency: Optional[Decimal] = None
    expense_date: datetime
    receipt_url: Optional[str] = None
    status: ExpenseStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "employee_id": 3,
                "company_id": 1,
                "category": "food",
                "description": "Team lunch",
                "amount": 50.00,
                "currency": "USD",
                "amount_in_base_currency": 50.00,
                "expense_date": "2024-01-15T12:00:00",
                "receipt_url": "/uploads/receipt.jpg",
                "status": "draft",
                "created_at": "2024-01-15T10:00:00",
                "updated_at": "2024-01-15T10:00:00"
            }
        }


class ExpenseListResponse(BaseModel):
    """Expense list response"""
    id: int
    category: ExpenseCategory
    description: str
    amount: Decimal
    currency: str
    amount_in_base_currency: Optional[Decimal] = None
    status: ExpenseStatus
    expense_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExpenseDetailResponse(ExpenseResponse):
    """Detailed expense response with approvals"""
    approvals: Optional[List] = None
    
    class Config:
        from_attributes = True