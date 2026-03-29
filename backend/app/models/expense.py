"""
Expense model
"""
from sqlalchemy import Column, String, Numeric, DateTime, Integer, ForeignKey, Index, Enum, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from enum import Enum as PyEnum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ExpenseCategory(str, PyEnum):
    """Expense category enumeration"""
    FOOD = "food"
    TRAVEL = "travel"
    ACCOMMODATION = "accommodation"
    MISCELLANEOUS = "miscellaneous"


class ExpenseStatus(str, PyEnum):
    """Expense status enumeration"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class Expense(BaseModel):
    """Expense model"""
    __tablename__ = "expenses"
    
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    category = Column(
        Enum(ExpenseCategory, values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        nullable=False,
    )
    description = Column(Text, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    amount_in_base_currency = Column(Numeric(15, 2), nullable=True)
    expense_date = Column(DateTime, nullable=False)
    receipt_url = Column(String(500), nullable=True)
    status = Column(
        Enum(ExpenseStatus, values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        default=ExpenseStatus.DRAFT.value,
        nullable=False,
    )
    
    # Relationships
    employee = relationship("User", back_populates="expenses", foreign_keys=[employee_id])
    company = relationship("Company", back_populates="expenses", foreign_keys=[company_id])
    approvals = relationship("Approval", back_populates="expense", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_expense_employee", "employee_id"),
        Index("idx_expense_company", "company_id"),
        Index("idx_expense_status", "status"),
        Index("idx_expense_date", "expense_date"),
        Index("idx_expense_category", "category"),
    )
    
    def __repr__(self):
        return f"<Expense(id={self.id}, employee_id={self.employee_id}, amount={self.amount}, status={self.status})>"