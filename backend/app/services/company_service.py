"""
Company management service
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy.future import select

from app.models.company import Company
from app.utils.exceptions import ResourceNotFoundException

logger = logging.getLogger(__name__)


class CompanyService:
    """Service for company operations"""

    def get_company_by_id(self, company_id: int, db: Session) -> Company:
        """Get company by ID"""
        company = db.execute(
            select(Company).where(Company.id == company_id)
        ).first()

        if not company:
            raise ResourceNotFoundException("Company", company_id)

        return company[0] if company else None

    def get_company_by_name(self, name: str, db: Session) -> Company:
        """Get company by name"""
        company = db.execute(
            select(Company).where(Company.name == name)
        ).first()

        return company[0] if company else None

    def create_company(
        self,
        name: str,
        country: str,
        currency: str,
        db: Session,
    ) -> Company:
        """Create new company"""
        try:
            company = Company(
                name=name,
                country=country,
                currency=currency,
            )

            db.add(company)
            db.commit()
            db.refresh(company)

            logger.info(f"Company created: {name}")
            return company

        except Exception as e:
            logger.error(f"Error creating company: {str(e)}")
            db.rollback()
            raise

    def update_company(
        self,
        company_id: int,
        name: str = None,
        country: str = None,
        currency: str = None,
        db: Session = None,
    ) -> Company:
        """Update company information"""
        try:
            company = self.get_company_by_id(company_id, db)

            if name:
                company.name = name

            if country:
                company.country = country

            if currency:
                company.currency = currency

            db.commit()
            db.refresh(company)

            logger.info(f"Company updated: {company.name}")
            return company

        except Exception as e:
            logger.error(f"Error updating company: {str(e)}")
            db.rollback()
            raise