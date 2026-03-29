"""
Custom exceptions
"""
from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base API exception"""
    
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


class InvalidCredentialsException(BaseAPIException):
    """Invalid credentials exception"""
    
    def __init__(self, detail: str = "Invalid email or password"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class UnauthorizedException(BaseAPIException):
    """Unauthorized exception"""
    
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(BaseAPIException):
    """Forbidden exception"""
    
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundException(BaseAPIException):
    """Not found exception"""
    
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ConflictException(BaseAPIException):
    """Conflict exception"""
    
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class ValidationException(BaseAPIException):
    """Validation exception"""
    
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class InternalServerException(BaseAPIException):
    """Internal server exception"""
    
    def __init__(self, detail: str = "Internal server error"):
        super().__init__(detail=detail, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)