"""
Middleware module
"""
from app.middleware.error_handler import (
    add_exception_handlers,
    ErrorHandlingMiddleware,
    exception_handler,
)

__all__ = [
    "add_exception_handlers",
    "ErrorHandlingMiddleware",
    "exception_handler",
]