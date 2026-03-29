"""
Seed database with demo users and expenses for testing
"""
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directories to path
sys.path.insert(0, '/app')

from app.core.database import SessionLocal, init_db
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.expense import Expense, ExpenseCategory, ExpenseStatus
from app.core.security import hash_password


def seed_database():
    """Populate database with demo data"""
    # Ensure database is initialized
    init_db()
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_company = db.query(Company).filter(Company.name == "Acme Corporation").first()
        if existing_company:
            print("Demo data already exists. Skipping seed.")
            return
        
        print("=== Seeding Database with Demo Data ===\n")
        
        # Create companies
        company1 = Company(
            name="Acme Corporation",
            country="US",
            currency="USD"
        )
        company2 = Company(
            name="Tech Startup Ltd",
            country="GB", 
            currency="GBP"
        )
        db.add_all([company1, company2])
        db.flush()
        print(f"✓ Created 2 companies")
        
        # Create users
        admin_user = User(
            email="admin@acmecorp.com",
            name="Alice Admin",
            password_hash=hash_password("AdminPassword123"),
            role=UserRole.ADMIN,
            company_id=company1.id,
            is_active=True
        )
        
        manager_user = User(
            email="manager@acmecorp.com",
            name="Bob Manager",
            password_hash=hash_password("ManagerPassword123"),
            role=UserRole.MANAGER,
            company_id=company1.id,
            is_active=True
        )
        
        emp1_user = User(
            email="emp1@acmecorp.com",
            name="Charlie Employee",
            password_hash=hash_password("EmpPassword123"),
            role=UserRole.EMPLOYEE,
            company_id=company1.id,
            is_active=True
        )
        
        emp2_user = User(
            email="emp2@acmecorp.com",
            name="Diana Employee",
            password_hash=hash_password("EmpPassword123"),
            role=UserRole.EMPLOYEE,
            company_id=company1.id,
            is_active=True
        )
        
        startup_admin = User(
            email="admin@techstartup.uk",
            name="Edward Startup",
            password_hash=hash_password("StartupPass123"),
            role=UserRole.ADMIN,
            company_id=company2.id,
            is_active=True
        )
        
        db.add_all([admin_user, manager_user, emp1_user, emp2_user, startup_admin])
        db.flush()
        print(f"✓ Created 5 users")
        
        # Create sample expenses
        today = datetime.now().date()
        expenses = [
            # Approved expenses
            Expense(
                employee_id=emp1_user.id,
                company_id=company1.id,
                category=ExpenseCategory.FOOD.value,
                description="Team lunch meeting",
                amount=Decimal("45.50"),
                currency="USD",
                amount_in_base_currency=Decimal("45.50"),
                expense_date=today - timedelta(days=5),
                status=ExpenseStatus.APPROVED.value
            ),
            Expense(
                employee_id=emp1_user.id,
                company_id=company1.id,
                category=ExpenseCategory.TRAVEL.value,
                description="Client visit taxi",
                amount=Decimal("28.00"),
                currency="USD",
                amount_in_base_currency=Decimal("28.00"),
                expense_date=today - timedelta(days=3),
                status=ExpenseStatus.APPROVED.value
            ),
            # Submitted for approval
            Expense(
                employee_id=emp2_user.id,
                company_id=company1.id,
                category=ExpenseCategory.ACCOMMODATION.value,
                description="Hotel for conference",
                amount=Decimal("185.00"),
                currency="USD",
                amount_in_base_currency=Decimal("185.00"),
                expense_date=today - timedelta(days=1),
                status=ExpenseStatus.SUBMITTED.value
            ),
            # Rejected expense
            Expense(
                employee_id=emp1_user.id,
                company_id=company1.id,
                category=ExpenseCategory.MISCELLANEOUS.value,
                description="Personal entertainment (REJECTED)",
                amount=Decimal("50.00"),
                currency="USD",
                amount_in_base_currency=Decimal("50.00"),
                expense_date=today - timedelta(days=10),
                status=ExpenseStatus.REJECTED.value
            ),
            # Draft expense
            Expense(
                employee_id=emp2_user.id,
                company_id=company1.id,
                category=ExpenseCategory.FOOD.value,
                description="Office supplies",
                amount=Decimal("23.45"),
                currency="USD",
                amount_in_base_currency=Decimal("23.45"),
                expense_date=today,
                status=ExpenseStatus.SUBMITTED.value
            ),
        ]
        
        db.add_all(expenses)
        db.flush()
        print(f"✓ Created 5 sample expenses")
        
        db.commit()
        print("\n=== Seed Complete ===")
        print("\nDemo Users for Testing:")
        print("  Admin:    admin@acmecorp.com / AdminPassword123")
        print("  Manager:  manager@acmecorp.com / ManagerPassword123")
        print("  Employee: emp1@acmecorp.com / EmpPassword123")
        print("            emp2@acmecorp.com / EmpPassword123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
