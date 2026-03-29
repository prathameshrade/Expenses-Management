"""
OCR service for receipt processing
"""

import logging
import os
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class OCRService:
    """Service for OCR operations using Google Vision"""

    def __init__(self):
        self.enabled = os.getenv("GOOGLE_CLOUD_VISION_ENABLED", "False") == "True"
        if self.enabled:
            try:
                from google.cloud import vision
                self.client = vision.ImageAnnotatorClient()
            except ImportError:
                logger.warning("Google Vision API not available")
                self.enabled = False

    async def extract_text_from_image(self, image_path: str) -> Optional[str]:
        """Extract text from image using OCR"""
        if not self.enabled:
            logger.warning("OCR service is not enabled")
            return None

        try:
            from google.cloud import vision
            
            with open(image_path, "rb") as image_file:
                content = image_file.read()

            image = vision.Image(content=content)
            response = self.client.document_text_detection(image=image)

            if response.text_annotations:
                return response.text_annotations[0].description

            return None

        except Exception as e:
            logger.error(f"OCR extraction error: {str(e)}")
            return None

    def parse_receipt_data(self, ocr_text: str) -> Dict[str, Any]:
        """Parse OCR text to extract receipt data"""
        from app.utils.helpers import (
            parse_currency_amount_from_text,
            extract_date_from_text,
        )

        return {
            "raw_text": ocr_text,
            "amount": parse_currency_amount_from_text(ocr_text),
            "date": extract_date_from_text(ocr_text),
            "vendor": self._extract_vendor(ocr_text),
        }

    def _extract_vendor(self, text: str) -> Optional[str]:
        """Extract vendor name from OCR text"""
        # Simple heuristic - first significant line
        lines = text.split("\n")
        for line in lines:
            if len(line.strip()) > 5:
                return line.strip()
        return None