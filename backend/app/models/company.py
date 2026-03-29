"""
Company model
"""
from sqlalchemy import Column, String, Boolean, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import logging

logger = logging.getLogger(__name__)


class Company(BaseModel):
    """Company model"""
    __tablename__ = "companies"
    
    name = Column(String(255), nullable=False, index=True)
    country = Column(String(100), nullable=False)
    currency = Column(String(3), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="company", cascade="all, delete-orphan")
    approval_rules = relationship("ApprovalRule", back_populates="company", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_company_name", "name"),
        Index("idx_company_active", "is_active"),
    )
    
    def __repr__(self):
        return f"<Company(id={self.id}, name={self.name}, country={self.country})>"