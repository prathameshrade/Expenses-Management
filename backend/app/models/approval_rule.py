"""Approval Rule Model"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ApprovalRule(Base):
    """Approval rules configuration model"""
    __tablename__ = "approval_rules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    min_amount = Column(Float, default=0, nullable=False)
    max_amount = Column(Float, nullable=True)
    approvers = Column(Text, nullable=False)  # JSON string of approver IDs
    min_approval_percentage = Column(Float, nullable=True)
    required_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_sequential = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="approval_rules")