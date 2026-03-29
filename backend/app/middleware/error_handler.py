"""
Error handling middleware and exception handlers
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
from app.utils.exceptions import (
    InvalidCredentialsException,
    ResourceNotFoundException,
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
    InvalidTokenException,
)

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware:
    """Middleware for global error handling"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        async def send_with_error_handling(message):
            await send(message)
        
        await self.app(scope, receive, send_with_error_handling)


async def exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Generic exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error",
            "errors": [str(exc)],
        },
    )


async def invalid_credentials_handler(
    request: Request, exc: InvalidCredentialsException
) -> JSONResponse:
    """Handle invalid credentials"""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "success": False,
            "message": exc.message,
            "errors": [exc.message],
        },
    )


async def not_found_handler(
    request: Request, exc: ResourceNotFoundException
) -> JSONResponse:
    """Handle not found errors"""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "success": False,
            "message": exc.message,
            "errors": [exc.message],
        },
    )


async def conflict_handler(
    request: Request, exc: ConflictException
) -> JSONResponse:
    """Handle conflict errors"""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "success": False,
            "message": exc.message,
            "errors": [exc.message],
        },
    )


async def unauthorized_handler(
    request: Request, exc: UnauthorizedException
) -> JSONResponse:
    """Handle unauthorized errors"""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "success": False,
            "message": exc.message,
            "errors": [exc.message],
        },
    )


async def forbidden_handler(
    request: Request, exc: ForbiddenException
) -> JSONResponse:
    """Handle forbidden errors"""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "success": False,
            "message": exc.message,
            "errors": [exc.message],
        },
    )


async def invalid_token_handler(
    request: Request, exc: InvalidTokenException
) -> JSONResponse:
    """Handle invalid token errors"""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "success": False,
            "message": exc.message,
            "errors": [exc.message],
        },
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle validation errors"""
    errors = []
    for error in exc.errors():
        field = ".".join(str(x) for x in error["loc"][1:])
        errors.append(f"{field}: {error['msg']}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "errors": errors,
        },
    )


def add_exception_handlers(app: FastAPI):
    """Add all exception handlers to FastAPI app"""
    app.add_exception_handler(InvalidCredentialsException, invalid_credentials_handler)
    app.add_exception_handler(ResourceNotFoundException, not_found_handler)
    app.add_exception_handler(ConflictException, conflict_handler)
    app.add_exception_handler(UnauthorizedException, unauthorized_handler)
    app.add_exception_handler(ForbiddenException, forbidden_handler)
    app.add_exception_handler(InvalidTokenException, invalid_token_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, exception_handler)