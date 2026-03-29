"""
Expense management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Header
from sqlalchemy import select
from sqlalchemy.orm import Session
from decimal import Decimal

from app.core.database import get_db
from app.models.expense import Expense, ExpenseStatus as ExpenseStatusModel
from app.models.user import User, UserRole
from app.models.company import Company
from app.schemas.expense_schema import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
)
from app.schemas.common_schema import ResponseMessage, create_response
from app.dependencies.auth_dependency import get_current_user
from app.services.curreny_service import CurrencyService

router = APIRouter(prefix="/api/v1/expenses", tags=["Expenses"])
currency_service = CurrencyService()


@router.get("", response_model=ResponseMessage)
async def list_expenses(
    skip: int = 0,
    limit: int = 10,
    status: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all expenses"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    query = select(Expense)
    if user.role in [UserRole.ADMIN, UserRole.MANAGER]:
        query = query.where(Expense.company_id == user.company_id)
    else:
        query = query.where(Expense.employee_id == user.id)

    if status:
        query = query.where(Expense.status == status.lower())

    expenses = db.execute(
        query.order_by(Expense.created_at.desc()).offset(skip).limit(limit)
    ).scalars().all()

    data = [
        ExpenseResponse.model_validate(expense).model_dump(mode="json")
        for expense in expenses
    ]
    return create_response(success=True, message="Expenses fetched", data=data)


@router.post("", response_model=ExpenseResponse)
async def create_expense(
    request: ExpenseCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new expense"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    # Get company's base currency
    company = db.execute(select(Company).where(Company.id == user.company_id)).scalar_one_or_none()
    base_currency = company.currency if company else "USD"
    
    # Convert amount to company's base currency
    amount_in_base = currency_service.convert(
        request.amount,
        request.currency,
        base_currency
    )

    expense = Expense(
        employee_id=user.id,
        company_id=user.company_id,
        category=request.category.value,
        description=request.description,
        amount=request.amount,
        currency=request.currency.upper(),
        amount_in_base_currency=amount_in_base,
        expense_date=request.expense_date,
        receipt_url=request.receipt_url,
        status=ExpenseStatusModel.SUBMITTED.value,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get expense by ID"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
        
    expense = db.execute(select(Expense).where(Expense.id == expense_id)).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if user.role == UserRole.EMPLOYEE and expense.employee_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if user.role in [UserRole.ADMIN, UserRole.MANAGER] and expense.company_id != user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    request: ExpenseUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update expense"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
        
    expense = db.execute(select(Expense).where(Expense.id == expense_id)).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    is_owner = expense.employee_id == user.id
    is_admin_or_manager = user.role in [UserRole.ADMIN, UserRole.MANAGER]
    if not is_owner and not is_admin_or_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    payload = request.model_dump(exclude_unset=True)
    if "status" in payload and not is_admin_or_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only manager/admin can update status")

    for key, value in payload.items():
        setattr(expense, key, value.value if hasattr(value, "value") else value)

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete expense"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
        
    expense = db.execute(select(Expense).where(Expense.id == expense_id)).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if user.role != UserRole.ADMIN and expense.employee_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    db.delete(expense)
    db.commit()
    return {"success": True, "message": "Expense deleted"}


@router.post("/{expense_id}/submit")
async def submit_expense(
    expense_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit expense for approval"""
    user_id = current_user["user_id"]
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
        
    expense = db.execute(select(Expense).where(Expense.id == expense_id)).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if expense.employee_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    expense.status = ExpenseStatusModel.SUBMITTED.value
    db.commit()
    db.refresh(expense)
    return {"success": True, "message": "Expense submitted", "data": expense}


@router.post("/upload-receipt", response_model=ResponseMessage)
async def upload_receipt(file: UploadFile = File(...)):
    """Upload receipt and extract data using OCR"""
    return {"success": True, "message": "Receipt upload not implemented yet"}