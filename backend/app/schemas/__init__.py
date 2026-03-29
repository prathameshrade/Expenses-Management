"""
Pydantic schemas for request/response validation
"""
# Common
from app.schemas.common_schema import ResponseMessage, create_response, create_error_response

# Authentication
from app.schemas.auth_schema import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    ChangePasswordRequest,
)

# User
from app.schemas.user_schema import (
    UserCreate,
    UserResponse,
    UserUpdate,
    UserListResponse,
    UserRole,
)

# Expense
from app.schemas.expense_schema import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    ExpenseListResponse,
    ExpenseDetailResponse,
    ExpenseCategory,
    ExpenseStatus,
)

# Approval
from app.schemas.approval_schema import (
    ApprovalResponse,
    ApprovalAction,
    ApprovalDetailResponse,
    ApprovalRuleCreate,
    ApprovalRuleResponse,
    ApprovalStatus,
)

# Company
from app.schemas.company_schema import (
    CompanyResponse,
    CompanyCreate,
)

__all__ = [
    # Common
    "ResponseMessage",
    "create_response",
    "create_error_response",
    # Auth
    "LoginRequest",
    "SignupRequest",
    "TokenResponse",
    "ChangePasswordRequest",
    # User
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "UserListResponse",
    "UserRole",
    # Expense
    "ExpenseCreate",
    "ExpenseResponse",
    "ExpenseUpdate",
    "ExpenseListResponse",
    "ExpenseDetailResponse",
    "ExpenseCategory",
    "ExpenseStatus",
    # Approval
    "ApprovalResponse",
    "ApprovalAction",
    "ApprovalDetailResponse",
    "ApprovalRuleCreate",
    "ApprovalRuleResponse",
    "ApprovalStatus",
    # Company
    "CompanyResponse",
    "CompanyCreate",
]