"""
Authentication service with JWT token management
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy.future import select
import jwt
from passlib.context import CryptContext

from app.config import settings
from app.models.user import User
from app.models.company import Company
from app.schemas.auth_schema import SignUpRequest, LoginRequest, TokenResponse
from app.utils.exceptions import (
    InvalidCredentialsException,
    ConflictException,
    ResourceNotFoundException,
    InvalidTokenException,
)
from app.utils.validators import validate_email, validate_password
from app.utils.helpers import safe_json_loads, calculate_expiration_time

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Service for authentication operations"""

    def __init__(self):
        self.algorithm = settings.ALGORITHM
        self.secret_key = settings.SECRET_KEY
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification error: {str(e)}")
            return False

    def create_access_token(self, user_id: int, email: str, role: str) -> str:
        """Create JWT access token"""
        try:
            payload = {
                "sub": str(user_id),
                "email": email,
                "role": role,
                "iat": datetime.utcnow(),
                "exp": calculate_expiration_time(self.access_token_expire_minutes),
            }
            encoded_jwt = jwt.encode(
                payload,
                self.secret_key,
                algorithm=self.algorithm,
            )
            return encoded_jwt
        except Exception as e:
            logger.error(f"Token creation error: {str(e)}")
            raise InvalidTokenException("Failed to create token")

    async def verify_token(self, token: str) -> dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
            )
            user_id = payload.get("sub")
            email = payload.get("email")
            role = payload.get("role")

            if not user_id or not email:
                raise InvalidTokenException("Invalid token payload")

            return {
                "user_id": int(user_id),
                "email": email,
                "role": role,
            }
        except jwt.ExpiredSignatureError:
            raise InvalidTokenException("Token has expired")
        except jwt.InvalidTokenError as e:
            logger.error(f"Token validation error: {str(e)}")
            raise InvalidTokenException("Invalid token")
        except Exception as e:
            logger.error(f"Unexpected token error: {str(e)}")
            raise InvalidTokenException("Token verification failed")

    def signup(self, request: SignUpRequest, db: Session) -> TokenResponse:
        """Register new user with company"""
        try:
            # Validate email format
            if not validate_email(request.email):
                raise ValueError("Invalid email format")

            # Validate password strength
            if not validate_password(request.password):
                raise ValueError(
                    "Password must be at least 8 characters with uppercase, "
                    "lowercase, and numbers"
                )

            # Check if email already exists
            existing_user = db.execute(
                select(User).where(User.email == request.email)
            ).first()
            if existing_user:
                raise ConflictException("Email already registered")

            # Create company for first admin
            company = Company(
                name=f"{request.name}'s Company",
                country=request.country,
                currency=self._get_currency_for_country(request.country),
            )
            db.add(company)
            db.flush()

            # Create new user
            hashed_password = self.hash_password(request.password)
            new_user = User(
                email=request.email,
                name=request.name,
                hashed_password=hashed_password,
                role="admin",  # First user is admin
                company_id=company.id,
                is_active=True,
            )
            db.add(new_user)
            db.commit()

            logger.info(f"New user registered: {request.email}")

            # Create token
            access_token = self.create_access_token(
                user_id=new_user.id,
                email=new_user.email,
                role=new_user.role,
            )

            return TokenResponse(
                access_token=access_token,
                token_type="bearer",
                user_id=new_user.id,
                email=new_user.email,
                name=new_user.name,
                role=new_user.role,
            )

        except ConflictException:
            raise
        except ValueError as e:
            raise ValueError(str(e))
        except Exception as e:
            logger.error(f"Signup error: {str(e)}")
            db.rollback()
            raise

    def login(self, request: LoginRequest, db: Session) -> TokenResponse:
        """Authenticate user and return token"""
        try:
            # Find user by email
            user = db.execute(
                select(User).where(User.email == request.email)
            ).first()

            if not user:
                user = user[0] if user else None

            if not user or not self.verify_password(
                request.password, user.hashed_password
            ):
                raise InvalidCredentialsException()

            if not user.is_active:
                raise InvalidCredentialsException("Account is inactive")

            logger.info(f"User logged in: {request.email}")

            # Create token
            access_token = self.create_access_token(
                user_id=user.id,
                email=user.email,
                role=user.role,
            )

            return TokenResponse(
                access_token=access_token,
                token_type="bearer",
                user_id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
            )

        except InvalidCredentialsException:
            raise
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            raise InvalidCredentialsException()

    def _get_currency_for_country(self, country_code: str) -> str:
        """Map country code to currency"""
        currency_map = {
            "US": "USD",
            "GB": "GBP",
            "CA": "CAD",
            "AU": "AUD",
            "IN": "INR",
            "DE": "EUR",
            "FR": "EUR",
            "JP": "JPY",
            "CN": "CNY",
            "BR": "BRL",
            "MX": "MXN",
            "ZA": "ZAR",
            "SG": "SGD",
            "HK": "HKD",
        }
        return currency_map.get(country_code.upper(), "USD")