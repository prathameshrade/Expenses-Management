"""
Approval schemas for request/response validation
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ApprovalStatus(str, Enum):
    """Approval status enumeration"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApprovalAction(BaseModel):
    """Approval action schema"""
    comments: Optional[str] = Field(None, max_length=1000)
    
    class Config:
        json_schema_extra = {
            "example": {
                "comments": "Looks good, approved!"
            }
        }


class ApprovalResponse(BaseModel):
    """Approval response schema"""
    id: int
    expense_id: int
    approver_id: int
    approval_order: int
    status: ApprovalStatus
    comments: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "expense_id": 2,
                "approver_id": 4,
                "approval_order": 1,
                "status": "pending",
                "comments": None,
                "approved_at": None,
                "created_at": "2024-01-15T10:00:00",
                "updated_at": "2024-01-15T10:00:00"
            }
        }


class ApprovalDetailResponse(BaseModel):
    """Detailed approval response"""
    id: int
    expense: dict
    approver: dict
    approval_order: int
    status: ApprovalStatus
    comments: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ApprovalRuleCreate(BaseModel):
    """Approval rule creation schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    min_amount: float = Field(default=0, ge=0)
    max_amount: Optional[float] = Field(None, gt=0)
    approvers: List[int] = Field(..., min_items=1)
    min_approval_percentage: Optional[float] = Field(None, ge=0, le=100)
    required_approver_id: Optional[int] = None
    is_sequential: bool = Field(default=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Small Expenses",
                "description": "For expenses under $100",
                "min_amount": 0,
                "max_amount": 100,
                "approvers": [4],
                "is_sequential": True,
                "min_approval_percentage": 100
            }
        }


class ApprovalRuleResponse(BaseModel):
    """Approval rule response schema"""
    id: int
    company_id: int
    name: str
    description: Optional[str] = None
    min_amount: float
    max_amount: Optional[float] = None
    approvers: List[int]
    min_approval_percentage: Optional[float] = None
    required_approver_id: Optional[int] = None
    is_sequential: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True