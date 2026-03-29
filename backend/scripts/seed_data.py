"""Database Seeding Script"""
import sys
sys.path.insert(0, '..')

from app.database import SessionLocal, create_all_tables
from app.models.company import Company
from app.models.user import User, UserRole
from app.security import hash_password


def seed_database():
    """Seed initial data"""
    create_all_tables()
    db = SessionLocal()
    
    try:
        # Create company
        company = Company(
            name="TechCorp",
            country="US",
            currency="USD"
        )
        db.add(company)
        db.flush()
        
        # Create admin user
        admin = User(
            email="admin@company.com",
            name="Admin User",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
            company_id=company.id
        )
        db.add(admin)
        
        # Create manager user
        manager = User(
            email="manager@company.com",
            name="Manager User",
            hashed_password=hash_password("manager123"),
            role=UserRole.MANAGER,
            company_id=company.id
        )
        db.add(manager)
        
        # Create employee user
        employee = User(
            email="employee@company.com",
            name="Employee User",
            hashed_password=hash_password("employee123"),
            role=UserRole.EMPLOYEE,
            company_id=company.id,
            manager_id=manager.id if manager else None
        )
        db.add(employee)
        
        db.commit()
        print("✓ Database seeded successfully!")
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()