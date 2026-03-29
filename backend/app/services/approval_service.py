"""
Approval management service
"""

import logging
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import and_

from app.models.approval import Approval
from app.models.approval_rule import ApprovalRule
from app.models.expense import Expense
from app.models.user import User
from app.utils.exceptions import (
    ResourceNotFoundException,
    ApprovalException,
    ValidationException,
)
from app.utils.constants import ApprovalStatus, ExpenseStatus

logger = logging.getLogger(__name__)


class ApprovalService:
    """Service for approval operations"""

    def get_approval_by_id(self, approval_id: int, db: Session) -> Approval:
        """Get approval by ID"""
        approval = db.execute(
            select(Approval).where(Approval.id == approval_id)
        ).first()

        if not approval:
            raise ResourceNotFoundException("Approval", approval_id)

        return approval[0] if approval else None

    def get_pending_approvals_for_user(
        self,
        approver_id: int,
        company_id: int,
        db: Session,
    ) -> List[dict]:
        """Get pending approvals for a user"""
        approvals = db.execute(
            select(Approval)
            .join(Expense)
            .where(
                and_(
                    Approval.approver_id == approver_id,
                    Approval.status == ApprovalStatus.PENDING.value,
                    Expense.company_id == company_id,
                )
            )
        ).all()

        result = []
        for approval in approvals:
            approval_obj = approval[0]
            expense = db.execute(
                select(Expense).where(Expense.id == approval_obj.expense_id)
            ).first()

            if expense:
                expense_obj = expense[0]
                result.append({
                    "approval_id": approval_obj.id,
                    "expense_id": approval_obj.expense_id,
                    "employee_name": db.execute(
                        select(User).where(User.id == expense_obj.employee_id)
                    ).first()[0].name,
                    "amount": expense_obj.amount,
                    "currency": expense_obj.currency,
                    "category": expense_obj.category,
                    "description": expense_obj.description,
                    "created_at": approval_obj.created_at,
                })

        return result

    def approve_expense(
        self,
        approval_id: int,
        comments: str = None,
        db: Session = None,
    ) -> Approval:
        """Approve expense"""
        try:
            approval = self.get_approval_by_id(approval_id, db)

            if approval.status != ApprovalStatus.PENDING.value:
                raise ValidationException("Approval already processed")

            approval.status = ApprovalStatus.APPROVED.value
            approval.comments = comments
            approval.approved_at = datetime.utcnow()

            db.commit()
            db.refresh(approval)

            logger.info(f"Approval approved: {approval_id}")

            # Check if all approvals are done
            self._check_expense_approval_status(approval.expense_id, db)

            return approval

        except Exception as e:
            logger.error(f"Error approving: {str(e)}")
            db.rollback()
            raise

    def reject_expense(
        self,
        approval_id: int,
        comments: str = None,
        db: Session = None,
    ) -> Approval:
        """Reject expense"""
        try:
            approval = self.get_approval_by_id(approval_id, db)

            if approval.status != ApprovalStatus.PENDING.value:
                raise ValidationException("Approval already processed")

            approval.status = ApprovalStatus.REJECTED.value
            approval.comments = comments
            approval.approved_at = datetime.utcnow()

            # Reject expense immediately
            expense = db.execute(
                select(Expense).where(Expense.id == approval.expense_id)
            ).first()[0]

            if approval.required:  # If this is a required approver
                expense.status = ExpenseStatus.REJECTED.value

            db.commit()
            db.refresh(approval)

            logger.info(f"Approval rejected: {approval_id}")

            return approval

        except Exception as e:
            logger.error(f"Error rejecting: {str(e)}")
            db.rollback()
            raise

    def _check_expense_approval_status(
        self,
        expense_id: int,
        db: Session,
    ) -> None:
        """Check if all approvals are complete for an expense"""
        approvals = db.execute(
            select(Approval).where(Approval.expense_id == expense_id)
        ).all()

        approvals_list = [a[0] for a in approvals]

        # Get approval rule
        expense = db.execute(
            select(Expense).where(Expense.id == expense_id)
        ).first()[0]

        # Check if all approvals are done
        pending_count = sum(
            1 for a in approvals_list if a.status == ApprovalStatus.PENDING.value
        )
        approved_count = sum(
            1 for a in approvals_list if a.status == ApprovalStatus.APPROVED.value
        )
        rejected_count = sum(
            1 for a in approvals_list if a.status == ApprovalStatus.REJECTED.value
        )

        if pending_count == 0:
            # All approvals processed
            if rejected_count > 0:
                expense.status = ExpenseStatus.REJECTED.value
            elif approved_count == len(approvals_list):
                expense.status = ExpenseStatus.APPROVED.value

            db.commit()

    def create_approvals_for_expense(
        self,
        expense_id: int,
        company_id: int,
        db: Session,
    ) -> List[Approval]:
        """Create approval records based on rules"""
        try:
            expense = db.execute(
                select(Expense).where(Expense.id == expense_id)
            ).first()[0]

            # Find matching approval rule
            rule = db.execute(
                select(ApprovalRule).where(
                    and_(
                        ApprovalRule.company_id == company_id,
                        ApprovalRule.is_active == True,
                        expense.amount >= ApprovalRule.min_amount,
                        (ApprovalRule.max_amount == None)
                        | (expense.amount <= ApprovalRule.max_amount),
                    )
                )
            ).first()

            if not rule:
                logger.warning(f"No approval rule found for expense {expense_id}")
                return []

            rule_obj = rule[0]

            # Create approval records
            approvals = []
            approver_ids = []  # Parse from rule.approvers JSON
            # TODO: Parse approver_ids from rule.approvers

            for order, approver_id in enumerate(approver_ids, start=1):
                approval = Approval(
                    expense_id=expense_id,
                    approver_id=approver_id,
                    approval_order=order,
                    status=ApprovalStatus.PENDING.value,
                )
                db.add(approval)
                approvals.append(approval)

            db.commit()
            logger.info(f"Approvals created for expense {expense_id}")

            return approvals

        except Exception as e:
            logger.error(f"Error creating approvals: {str(e)}")
            db.rollback()
            raise