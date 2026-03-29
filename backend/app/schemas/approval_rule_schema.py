"""
Approval Rule schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ApprovalRuleCreate(BaseModel):
    """Create approval rule request"""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    min_amount: Decimal = Field(0, ge=0)
    max_amount: Optional[Decimal] = Field(None, gt=0)
    approvers: List[int] = Field(..., min_length=1)
    min_approval_percentage: Optional[Decimal] = Field(50, ge=1, le=100)
    required_approver_id: Optional[int] = None
    is_sequential: bool = Field(True)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Small Expenses",
                "description": "For expenses under $100",
                "min_amount": 0,
                "max_amount": 100,
                "approvers": [4, 5],
                "min_approval_percentage": 50,
                "required_approver_id": 4,
                "is_sequential": True,
            }
        }


class ApprovalRuleUpdate(BaseModel):
    """Update approval rule request"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    min_amount: Optional[Decimal] = Field(None, ge=0)
    max_amount: Optional[Decimal] = Field(None, gt=0)
    approvers: Optional[List[int]] = Field(None, min_length=1)
    min_approval_percentage: Optional[Decimal] = Field(None, ge=1, le=100)
    required_approver_id: Optional[int] = None
    is_sequential: Optional[bool] = None
    is_active: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Updated Rule",
                "is_sequential": False,
            }
        }


class ApprovalRuleResponse(BaseModel):
    """Approval rule response"""
    id: int
    company_id: int
    name: str
    description: Optional[str]
    min_amount: Decimal
    max_amount: Optional[Decimal]
    approvers: List[int]
    min_approval_percentage: Decimal
    required_approver_id: Optional[int]
    is_sequential: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "company_id": 1,
                "name": "Small Expenses",
                "description": "For expenses under $100",
                "min_amount": 0,
                "max_amount": 100,
                "approvers": [4, 5],
                "min_approval_percentage": 50,
                "required_approver_id": 4,
                "is_sequential": True,
                "is_active": True,
                "created_at": "2024-01-15T10:30:00",
                "updated_at": "2024-01-15T10:30:00",
            }
        }


class ApprovalRuleListResponse(BaseModel):
    """List approval rules response"""
    success: bool
    data: list[ApprovalRuleResponse]
    total: int