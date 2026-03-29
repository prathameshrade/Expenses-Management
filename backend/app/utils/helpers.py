"""
Utility helper functions
"""
import os
import hashlib
import random
import string
import re
from typing import Optional
from datetime import datetime
import aiofiles
import logging

logger = logging.getLogger(__name__)

# File upload configuration
UPLOAD_DIR = "./uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def ensure_upload_dir():
    """Ensure upload directory exists"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def hash_file(file_path: str) -> str:
    """Generate SHA256 hash of file"""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        logger.error(f"Error hashing file: {e}")
        return ""


async def save_upload_file(file, filename: str) -> Optional[str]:
    """
    Save uploaded file
    
    Args:
        file: FastAPI UploadFile
        filename: Name to save file as
        
    Returns:
        File path if successful, None otherwise
    """
    try:
        ensure_upload_dir()
        
        # Validate file extension
        _, ext = os.path.splitext(filename)
        if ext.lower() not in ALLOWED_EXTENSIONS:
            logger.warning(f"Invalid file extension: {ext}")
            return None
        
        # Check file size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            logger.warning(f"File size exceeds limit: {len(content)}")
            return None
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        
        logger.info(f"File saved: {file_path}")
        return file_path
    
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        return None


async def delete_file(file_path: str) -> bool:
    """Delete file"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"File deleted: {file_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return False


def generate_random_string(length: int = 32) -> str:
    """Generate random string"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    """
    Convert currency
    Note: This is a placeholder. Implement with real currency API
    """
    try:
        # TODO: Integrate with currency conversion API
        # For now, just return the same amount
        logger.warning(f"Currency conversion not implemented: {from_currency} -> {to_currency}")
        return amount
    except Exception as e:
        logger.error(f"Error converting currency: {e}")
        return amount


def format_currency(amount: float, currency: str = "USD") -> str:
    """Format amount as currency string"""
    return f"{currency} {amount:,.2f}"


def get_file_extension(filename: str) -> str:
    """Get file extension"""
    return os.path.splitext(filename)[1].lower()


def generate_filename(original_filename: str, prefix: str = "") -> str:
    """Generate unique filename"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    random_str = generate_random_string(8)
    ext = get_file_extension(original_filename)
    return f"{prefix}_{timestamp}_{random_str}{ext}"