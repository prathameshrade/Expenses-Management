"""
Custom exception classes for the Expense Management System
"""

from typing import Any, Dict, Optional


class BaseException(Exception):
    """Base exception class"""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        detail: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail or {}
        super().__init__(self.message)


class InvalidCredentialsException(BaseException):
    """Raised when email/password credentials are invalid"""

    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(message=message, status_code=401)


class UnauthorizedException(BaseException):
    """Raised when user is not authorized"""

    def __init__(self, message: str = "Unauthorized access"):
        super().__init__(message=message, status_code=401)


class ForbiddenException(BaseException):
    """Raised when user doesn't have permission"""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, status_code=403)


class ResourceNotFoundException(BaseException):
    """Raised when resource is not found"""

    def __init__(self, resource: str = "Resource", resource_id: Optional[Any] = None):
        if resource_id:
            message = f"{resource} with id {resource_id} not found"
        else:
            message = f"{resource} not found"
        super().__init__(message=message, status_code=404)


class ConflictException(BaseException):
    """Raised when resource already exists"""

    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message=message, status_code=409)


class ValidationException(BaseException):
    """Raised when validation fails"""

    def __init__(self, message: str = "Validation error", detail: Dict[str, Any] = None):
        super().__init__(message=message, status_code=400, detail=detail or {})


class DatabaseException(BaseException):
    """Raised when database operation fails"""

    def __init__(self, message: str = "Database error"):
        super().__init__(message=message, status_code=500)


class ExternalAPIException(BaseException):
    """Raised when external API call fails"""

    def __init__(self, service: str = "External service", message: str = "Service unavailable"):
        full_message = f"{service}: {message}"
        super().__init__(message=full_message, status_code=503)


class InvalidTokenException(BaseException):
    """Raised when JWT token is invalid"""

    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(message=message, status_code=401)


class InsufficientPermissionsException(BaseException):
    """Raised when user doesn't have required role"""

    def __init__(self, required_role: str):
        message = f"This action requires {required_role} role"
        super().__init__(message=message, status_code=403)


class ExpenseNotDraftException(BaseException):
    """Raised when trying to modify non-draft expense"""

    def __init__(self):
        message = "Can only modify expenses in draft status"
        super().__init__(message=message, status_code=400)


class ApprovalException(BaseException):
    """Raised when approval operation fails"""

    def __init__(self, message: str = "Approval operation failed"):
        super().__init__(message=message, status_code=400)


class FileUploadException(BaseException):
    """Raised when file upload fails"""

    def __init__(self, message: str = "File upload failed"):
        super().__init__(message=message, status_code=400)


class OCRProcessingException(BaseException):
    """Raised when OCR processing fails"""

    def __init__(self, message: str = "Failed to process receipt image"):
        super().__init__(message=message, status_code=500)