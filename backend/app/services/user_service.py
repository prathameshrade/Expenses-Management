"""
User management service
"""

import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.future import select

from app.models.user import User
from app.models.company import Company
from app.schemas.user_schema import UserCreate, UserUpdate, UserResponse
from app.utils.exceptions import (
    ResourceNotFoundException,
    ConflictException,
    ValidationException,
    InsufficientPermissionsException,
)
from app.utils.validators import validate_email, validate_password
from app.services.auth_service import pwd_context

logger = logging.getLogger(__name__)


class UserService:
    """Service for user operations"""

    def get_user_by_id(self, user_id: int, db: Session) -> User:
        """Get user by ID"""
        user = db.execute(
            select(User).where(User.id == user_id)
        ).first()
        
        if not user:
            raise ResourceNotFoundException("User", user_id)
        
        return user[0] if user else None

    def get_user_by_email(self, email: str, db: Session) -> Optional[User]:
        """Get user by email"""
        user = db.execute(
            select(User).where(User.email == email)
        ).first()
        
        return user[0] if user else None

    def get_company_users(
        self,
        company_id: int,
        db: Session,
        role: Optional[str] = None,
    ) -> List[User]:
        """Get all users in a company"""
        query = select(User).where(User.company_id == company_id)
        
        if role:
            query = query.where(User.role == role)
        
        users = db.execute(query).all()
        return [user[0] for user in users]

    def create_user(
        self,
        user_create: UserCreate,
        company_id: int,
        db: Session,
    ) -> User:
        """Create new user"""
        try:
            # Validate email
            if not validate_email(user_create.email):
                raise ValidationException("Invalid email format")

            # Check if email exists
            existing_user = self.get_user_by_email(user_create.email, db)
            if existing_user:
                raise ConflictException("Email already registered")

            # Validate password if provided
            if user_create.password and not validate_password(user_create.password):
                raise ValidationException(
                    "Password must be at least 8 characters with uppercase, "
                    "lowercase, and numbers"
                )

            # Hash password
            hashed_password = pwd_context.hash(
                user_create.password or "TempPassword123!"
            )

            # Create user
            new_user = User(
                email=user_create.email,
                name=user_create.name,
                hashed_password=hashed_password,
                role=user_create.role or "employee",
                company_id=company_id,
                manager_id=user_create.manager_id,
                is_active=True,
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            logger.info(f"User created: {user_create.email}")
            return new_user

        except (ValidationException, ConflictException):
            raise
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            db.rollback()
            raise

    def update_user(
        self,
        user_id: int,
        user_update: UserUpdate,
        db: Session,
    ) -> User:
        """Update user information"""
        try:
            user = self.get_user_by_id(user_id, db)

            if user_update.name:
                user.name = user_update.name

            if user_update.manager_id is not None:
                user.manager_id = user_update.manager_id

            if user_update.role:
                user.role = user_update.role

            if user_update.is_manager_approver is not None:
                user.is_manager_approver = user_update.is_manager_approver

            db.commit()
            db.refresh(user)

            logger.info(f"User updated: {user.email}")
            return user

        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            db.rollback()
            raise

    def deactivate_user(self, user_id: int, db: Session) -> User:
        """Deactivate user"""
        user = self.get_user_by_id(user_id, db)
        user.is_active = False
        db.commit()

        logger.info(f"User deactivated: {user.email}")
        return user

    def activate_user(self, user_id: int, db: Session) -> User:
        """Activate user"""
        user = self.get_user_by_id(user_id, db)
        user.is_active = True
        db.commit()

        logger.info(f"User activated: {user.email}")
        return user

    def change_password(
        self,
        user_id: int,
        old_password: str,
        new_password: str,
        db: Session,
    ) -> User:
        """Change user password"""
        try:
            user = self.get_user_by_id(user_id, db)

            # Verify old password
            if not pwd_context.verify(old_password, user.hashed_password):
                raise ValidationException("Current password is incorrect")

            # Validate new password
            if not validate_password(new_password):
                raise ValidationException("New password does not meet requirements")

            # Update password
            user.hashed_password = pwd_context.hash(new_password)
            db.commit()

            logger.info(f"Password changed for user: {user.email}")
            return user

        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"Error changing password: {str(e)}")
            raise

    def get_user_managers(
        self,
        company_id: int,
        db: Session,
    ) -> List[User]:
        """Get all managers in a company"""
        return self.get_company_users(company_id, db, role="manager")

    def is_user_manager(self, user_id: int, db: Session) -> bool:
        """Check if user is a manager"""
        user = self.get_user_by_id(user_id, db)
        return user.role == "manager" or user.role == "admin"