"""
Authentication dependency injections
"""

from fastapi import Depends, Header
from typing import Optional
from app.services.auth_service import AuthService
from app.utils.exceptions import InvalidTokenException, UnauthorizedException

auth_service = AuthService()


async def get_current_user(
    authorization: Optional[str] = Header(None),
):
    """
    Extract and validate current user from JWT token
    """
    if not authorization:
        raise UnauthorizedException("Authorization header missing")

    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise InvalidTokenException("Invalid authorization header format")

    token = parts[1]

    try:
        user = await auth_service.verify_token(token)
        return user
    except InvalidTokenException:
        raise
    except Exception as e:
        raise InvalidTokenException(f"Token validation failed: {str(e)}")