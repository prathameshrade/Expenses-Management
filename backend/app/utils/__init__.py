"""
Utilities module
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def get_logger(name: str) -> logging.Logger:
    """Get logger instance"""
    return logging.getLogger(name)


# Import helper functions
try:
    from app.utils.helpers import (
        hash_file,
        save_upload_file,
        delete_file,
        generate_random_string,
        validate_email,
        convert_currency,
        format_currency,
    )
except ImportError as e:
    logger.warning(f"Could not import helpers: {e}")

__all__ = [
    "logger",
    "get_logger",
    "hash_file",
    "save_upload_file",
    "delete_file",
    "generate_random_string",
    "validate_email",
    "convert_currency",
    "format_currency",
]