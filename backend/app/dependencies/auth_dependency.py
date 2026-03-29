"""
Authentication dependency injections
"""

from fastapi import Depends, Header
from typing import Optional
from app.core.security import decode_token
from app.utils.exceptions import InvalidTokenException, UnauthorizedException


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
        payload = decode_token(token)
        if not payload:
            raise InvalidTokenException("Token validation failed")
        
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
    except InvalidTokenException:
        raise
    except Exception as e:
        raise InvalidTokenException(f"Token validation failed: {str(e)}")