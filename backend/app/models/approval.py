"""
Approval models
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Index, Enum, Text, Float, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from enum import Enum as PyEnum
import logging

logger = logging.getLogger(__name__)


class ApprovalStatus(str, PyEnum):
    """Approval status enumeration"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Approval(BaseModel):
    """Approval model"""
    __tablename__ = "approvals"
    
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False, index=True)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    approval_order = Column(Integer, nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False)
    comments = Column(Text, nullable=True)
    approved_at = Column(String, nullable=True)
    
    # Relationships
    expense = relationship("Expense", back_populates="approvals", foreign_keys=[expense_id])
    approver = relationship("User", back_populates="approvals", foreign_keys=[approver_id])
    
    # Indexes
    __table_args__ = (
        Index("idx_approval_expense", "expense_id"),
        Index("idx_approval_approver", "approver_id"),
        Index("idx_approval_status", "status"),
    )
    
    def __repr__(self):
        return f"<Approval(id={self.id}, expense_id={self.expense_id}, approver_id={self.approver_id}, status={self.status})>"


class ApprovalRule(BaseModel):
    """Approval rule model"""
    __tablename__ = "approval_rules"
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    min_amount = Column(Float, default=0, nullable=False)
    max_amount = Column(Float, nullable=True)
    approvers = Column(String, nullable=False)  # JSON string of approver IDs
    min_approval_percentage = Column(Float, nullable=True)
    required_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_sequential = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    company = relationship("Company", back_populates="approval_rules", foreign_keys=[company_id])
    required_approver = relationship("User", foreign_keys=[required_approver_id])
    
    # Indexes
    __table_args__ = (
        Index("idx_rule_company", "company_id"),
        Index("idx_rule_active", "is_active"),
        Index("idx_rule_amount_range", "min_amount", "max_amount"),
    )
    
    def __repr__(self):
        return f"<ApprovalRule(id={self.id}, company_id={self.company_id}, name={self.name})>"