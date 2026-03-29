"""
Common schemas for API responses
"""
from typing import Any, Optional, List
from pydantic import BaseModel


class ResponseMessage(BaseModel):
    """Standard response message"""
    success: bool
    message: str
    data: Optional[Any] = None
    errors: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Operation successful",
                "data": {},
                "errors": None
            }
        }


def create_response(
    success: bool = True,
    message: str = "Operation successful",
    data: Any = None
) -> dict:
    """Create a standard response"""
    return {
        "success": success,
        "message": message,
        "data": data,
    }


def create_error_response(
    message: str = "An error occurred",
    errors: List[str] = None
) -> dict:
    """Create a standard error response"""
    return {
        "success": False,
        "message": message,
        "errors": errors or [],
    }