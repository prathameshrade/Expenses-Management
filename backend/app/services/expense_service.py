"""
Expense management service
"""

import logging
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import and_, or_

from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense_schema import ExpenseCreate, ExpenseUpdate
from app.utils.exceptions import (
    ResourceNotFoundException,
    ExpenseNotDraftException,
    ValidationException,
)
from app.utils.constants import ExpenseStatus, ExpenseCategory
from app.services.curreny_service import CurrencyService

logger = logging.getLogger(__name__)

currency_service = CurrencyService()


class ExpenseService:
    """Service for expense operations"""

    def get_expense_by_id(self, expense_id: int, db: Session) -> Expense:
        """Get expense by ID"""
        expense = db.execute(
            select(Expense).where(Expense.id == expense_id)
        ).first()

        if not expense:
            raise ResourceNotFoundException("Expense", expense_id)

        return expense[0] if expense else None

    def get_user_expenses(
        self,
        user_id: int,
        company_id: int,
        db: Session,
        status: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[Expense]:
        """Get all expenses for a user"""
        query = select(Expense).where(
            and_(
                Expense.employee_id == user_id,
                Expense.company_id == company_id,
            )
        )

        if status:
            query = query.where(Expense.status == status)

        if category:
            query = query.where(Expense.category == category)

        expenses = db.execute(query.order_by(Expense.created_at.desc())).all()
        return [expense[0] for expense in expenses]

    def get_company_expenses(
        self,
        company_id: int,
        db: Session,
        status: Optional[str] = None,
    ) -> List[Expense]:
        """Get all expenses in a company"""
        query = select(Expense).where(Expense.company_id == company_id)

        if status:
            query = query.where(Expense.status == status)

        expenses = db.execute(query.order_by(Expense.created_at.desc())).all()
        return [expense[0] for expense in expenses]

    def create_expense(
        self,
        expense_create: ExpenseCreate,
        employee_id: int,
        company_id: int,
        db: Session,
    ) -> Expense:
        """Create new expense"""
        try:
            # Validate category
            if expense_create.category not in [e.value for e in ExpenseCategory]:
                raise ValidationException(f"Invalid category: {expense_create.category}")

            # Create expense
            expense = Expense(
                employee_id=employee_id,
                company_id=company_id,
                amount=expense_create.amount,
                currency=expense_create.currency,
                amount_in_base_currency=expense_create.amount,  # Will be converted
                category=expense_create.category,
                description=expense_create.description,
                expense_date=expense_create.expense_date,
                status=ExpenseStatus.DRAFT.value,
            )

            # Try to convert currency if different
            if expense_create.currency != "USD":  # Assuming USD as base
                try:
                    converted_amount = currency_service.convert(
                        expense_create.amount,
                        expense_create.currency,
                        "USD",
                    )
                    expense.amount_in_base_currency = converted_amount
                except Exception as e:
                    logger.warning(f"Currency conversion failed: {str(e)}")
                    # Keep original amount if conversion fails
                    expense.amount_in_base_currency = expense_create.amount

            db.add(expense)
            db.commit()
            db.refresh(expense)

            logger.info(f"Expense created: {expense.id}")
            return expense

        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"Error creating expense: {str(e)}")
            db.rollback()
            raise

    def update_expense(
        self,
        expense_id: int,
        expense_update: ExpenseUpdate,
        db: Session,
    ) -> Expense:
        """Update expense (only in draft status)"""
        try:
            expense = self.get_expense_by_id(expense_id, db)

            if expense.status != ExpenseStatus.DRAFT.value:
                raise ExpenseNotDraftException()

            if expense_update.description:
                expense.description = expense_update.description

            if expense_update.amount:
                expense.amount = expense_update.amount

            if expense_update.category:
                expense.category = expense_update.category

            if expense_update.expense_date:
                expense.expense_date = expense_update.expense_date

            db.commit()
            db.refresh(expense)

            logger.info(f"Expense updated: {expense.id}")
            return expense

        except ExpenseNotDraftException:
            raise
        except Exception as e:
            logger.error(f"Error updating expense: {str(e)}")
            db.rollback()
            raise

    def submit_expense(self, expense_id: int, db: Session) -> Expense:
        """Submit expense for approval"""
        try:
            expense = self.get_expense_by_id(expense_id, db)

            if expense.status != ExpenseStatus.DRAFT.value:
                raise ValidationException("Can only submit draft expenses")

            expense.status = ExpenseStatus.SUBMITTED.value
            db.commit()
            db.refresh(expense)

            logger.info(f"Expense submitted: {expense.id}")
            return expense

        except Exception as e:
            logger.error(f"Error submitting expense: {str(e)}")
            db.rollback()
            raise

    def get_submitted_expenses(
        self,
        company_id: int,
        db: Session,
    ) -> List[Expense]:
        """Get all submitted expenses awaiting approval"""
        return self.get_company_expenses(
            company_id, db, status=ExpenseStatus.SUBMITTED.value
        )

    def delete_expense(self, expense_id: int, db: Session) -> bool:
        """Delete expense (only in draft status)"""
        try:
            expense = self.get_expense_by_id(expense_id, db)

            if expense.status != ExpenseStatus.DRAFT.value:
                raise ExpenseNotDraftException()

            db.delete(expense)
            db.commit()

            logger.info(f"Expense deleted: {expense_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting expense: {str(e)}")
            db.rollback()
            raise