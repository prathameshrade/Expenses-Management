"""
API routes module
"""
from app.routes import auth_routes, user_routes, expense_routes, approval_routes

__all__ = [
    "auth_routes",
    "user_routes",
    "expense_routes",
    "approval_routes",
]