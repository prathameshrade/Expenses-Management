"""
Expense management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.expense_schema import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    ExpenseListResponse,
)
from app.schemas.common_schema import ResponseMessage
from typing import List

router = APIRouter(prefix="/api/v1/expenses", tags=["Expenses"])


@router.get("", response_model=ResponseMessage)
async def list_expenses(
    skip: int = 0,
    limit: int = 10,
    status: str = None,
    db: Session = Depends(get_db)
):
    """List all expenses"""
    # TODO: Implement list expenses
    pass


@router.post("", response_model=ExpenseResponse)
async def create_expense(
    request: ExpenseCreate,
    db: Session = Depends(get_db)
):
    """Create new expense"""
    # TODO: Implement create expense
    pass


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """Get expense by ID"""
    # TODO: Implement get expense
    pass


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    request: ExpenseUpdate,
    db: Session = Depends(get_db)
):
    """Update expense"""
    # TODO: Implement update expense
    pass


@router.delete("/{expense_id}")
async def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """Delete expense"""
    # TODO: Implement delete expense
    pass


@router.post("/{expense_id}/submit")
async def submit_expense(expense_id: int, db: Session = Depends(get_db)):
    """Submit expense for approval"""
    # TODO: Implement submit expense
    pass


@router.post("/upload-receipt", response_model=ResponseMessage)
async def upload_receipt(file: UploadFile = File(...)):
    """Upload receipt and extract data using OCR"""
    # TODO: Implement receipt upload and OCR
    pass