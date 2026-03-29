"""
Currency conversion service
"""

import logging
from typing import Dict
from decimal import Decimal
import os

logger = logging.getLogger(__name__)


class CurrencyService:
    """Service for currency conversion"""

    def __init__(self):
        self.cache: Dict = {}
        self.enabled = os.getenv("CURRENCY_CONVERSION_ENABLED", "True") == "True"

    def convert(
        self,
        amount: Decimal | float,
        from_currency: str,
        to_currency: str,
    ) -> Decimal:
        """Convert amount from one currency to another"""
        if from_currency == to_currency:
            return Decimal(str(amount))

        try:
            # Mock conversion rate (in production, use real API)
            # Example rates to USD
            rates = {
                "USD": 1.0,
                "EUR": 1.1,
                "GBP": 1.27,
                "JPY": 0.0093,
                "INR": 0.012,
                "CAD": 0.74,
                "AUD": 0.65,
            }

            from_rate = rates.get(from_currency.upper(), 1.0)
            to_rate = rates.get(to_currency.upper(), 1.0)

            converted = (Decimal(str(amount)) / Decimal(str(from_rate))) * Decimal(
                str(to_rate)
            )
            return converted.quantize(Decimal("0.01"))

        except Exception as e:
            logger.error(f"Currency conversion error: {str(e)}")
            # Return original amount if conversion fails
            return Decimal(str(amount))

    def get_exchange_rate(
        self,
        from_currency: str,
        to_currency: str,
    ) -> Decimal:
        """Get exchange rate between two currencies"""
        try:
            amount = Decimal("1")
            return self.convert(amount, from_currency, to_currency)
        except Exception as e:
            logger.error(f"Error getting exchange rate: {str(e)}")
            return Decimal("1")