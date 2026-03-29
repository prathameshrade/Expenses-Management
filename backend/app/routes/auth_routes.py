"""
Authentication routes
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.auth_schema import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    ChangePasswordRequest,
)
from app.dependencies.auth_dependency import get_current_user
from app.utils.exceptions import InvalidTokenException

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def _to_user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "company_id": user.company_id,
    }


def _get_or_create_default_company(db: Session, country: str) -> Company:
    company = db.execute(select(Company).where(Company.name == "Default Company")).scalar_one_or_none()
    if company:
        return company

    company = Company(
        name="Default Company",
        country=country.upper(),
        currency="USD",
    )
    db.add(company)
    db.flush()
    return company


def _parse_role(role: str) -> UserRole:
    role_map = {
        "admin": UserRole.ADMIN,
        "manager": UserRole.MANAGER,
        "employee": UserRole.EMPLOYEE,
    }
    return role_map.get((role or "employee").lower(), UserRole.EMPLOYEE)


@router.post("/signup", response_model=TokenResponse)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """User signup endpoint"""
    existing = db.execute(select(User).where(User.email == request.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    company = _get_or_create_default_company(db, request.country)
    user = User(
        email=request.email,
        name=request.name,
        password_hash=hash_password(request.password),
        role=_parse_role(request.role or "employee"),
        company_id=company.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "company_id": user.company_id,
        },
        expires_delta=timedelta(minutes=60),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_to_user_payload(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """User login endpoint"""
    user = db.execute(select(User).where(User.email == request.email)).scalar_one_or_none()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "company_id": user.company_id,
        },
        expires_delta=timedelta(minutes=60),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_to_user_payload(user),
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password endpoint"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    
    # Verify current password
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password incorrect")
    
    # Update password
    user.password_hash = hash_password(request.new_password)
    db.commit()
    
    return {"success": True, "message": "Password changed successfully"}


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh access token endpoint"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    
    # Create new token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "company_id": user.company_id,
        },
        expires_delta=timedelta(minutes=60),
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_to_user_payload(user),
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout endpoint"""
    # In a real application, you would invalidate the token here
    # For now, we just return success - the client should discard the token
    return {"success": True, "message": "Logged out successfully"}