"""
Authentication service with JWT token management
(Legacy file - auth_dependency now uses core/security functions directly)
Kept for backward compatibility with user_service.py which imports pwd_context
"""

from passlib.context import CryptContext

# Password hashing context (used by user_service.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Legacy AuthService class removed - use auth_dependency.get_current_user() instead