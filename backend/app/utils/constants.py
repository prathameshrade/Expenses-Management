"""
Application constants
"""

from enum import Enum

# Expense Status
class ExpenseStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


# Approval Status
class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# User Roles
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"


# Expense Categories
class ExpenseCategory(str, Enum):
    FOOD = "food"
    TRAVEL = "travel"
    ACCOMMODATION = "accommodation"
    MISCELLANEOUS = "miscellaneous"


# File Upload Constants
ALLOWED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'gif', 'bmp']
MAX_FILE_SIZE_MB = 10
UPLOAD_DIRECTORY = "uploads"
RECEIPTS_DIRECTORY = "uploads/receipts"

# Token Configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
JWT_ALGORITHM = "HS256"

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# API Response Messages
RESPONSE_MESSAGES = {
    "CREATED": "Resource created successfully",
    "UPDATED": "Resource updated successfully",
    "DELETED": "Resource deleted successfully",
    "INVALID_CREDENTIALS": "Invalid email or password",
    "EMAIL_EXISTS": "Email already registered",
    "NOT_FOUND": "Resource not found",
    "UNAUTHORIZED": "Unauthorized access",
    "FORBIDDEN": "You don't have permission",
    "VALIDATION_ERROR": "Validation failed",
    "INTERNAL_ERROR": "Internal server error",
}

# Approval Rules Defaults
DEFAULT_MIN_APPROVAL_PERCENTAGE = 50
DEFAULT_SEQUENTIAL_APPROVAL = True

# Currency Conversion
CURRENCY_CACHE_TTL = 3600  # 1 hour
SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD',
    'NZD', 'INR', 'MXN', 'BRL', 'ZAR', 'SGD', 'HKD',
    'NOK', 'SEK', 'DKK', 'CNY', 'AED', 'SAR'
]

# Logging
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_LEVEL = "INFO"

# Email Configuration (if using email notifications)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "noreply@expensemanagement.com"