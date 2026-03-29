"""
Data validators
"""
from decimal import Decimal
from datetime import datetime


def validate_amount(amount: float) -> bool:
    """Validate expense amount"""
    return isinstance(amount, (int, float, Decimal)) and amount > 0


def validate_currency(currency: str) -> bool:
    """Validate currency code"""
    return isinstance(currency, str) and len(currency) == 3 and currency.isupper()


def validate_date(date: datetime) -> bool:
    """Validate date"""
    return isinstance(date, datetime)