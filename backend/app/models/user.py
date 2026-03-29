"""
User model
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Index, Enum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from enum import Enum as PyEnum
import logging

logger = logging.getLogger(__name__)


class UserRole(str, PyEnum):
    """User role enumeration"""
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class User(BaseModel):
    """User model"""
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column("hashed_password", String(255), nullable=False)
    role = Column(
        Enum(UserRole, values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        default=UserRole.EMPLOYEE.value,
        nullable=False,
    )
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_manager_approver = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    company = relationship("Company", back_populates="users", foreign_keys=[company_id])
    manager = relationship("User", remote_side="User.id", backref="subordinates")
    expenses = relationship("Expense", back_populates="employee", foreign_keys="Expense.employee_id")
    approvals = relationship("Approval", back_populates="approver", foreign_keys="Approval.approver_id")
    
    # Indexes
    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_company", "company_id"),
        Index("idx_user_active", "is_active"),
        Index("idx_user_role", "role"),
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name}, role={self.role})>"