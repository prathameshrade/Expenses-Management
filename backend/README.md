# Backend - Reimbursement Management

FastAPI backend service for authentication, expenses, approvals, and OCR integrations.

## Prerequisites

- Python 3.11+
- MySQL 8.0+
- Docker Desktop (optional, recommended for DB)

## Option A: Run Backend with Docker Compose (from project root)

```powershell
cd "d:\Reimbursement management"
docker compose up --build -d backend mysql
```

Backend is available at:

- http://localhost:8000
- http://localhost:8000/docs

## Option B: Run Backend Locally

### 1. Start database

Use Docker MySQL service:

```powershell
cd "d:\Reimbursement management"
docker compose up -d mysql
```

MySQL host connection:

- Host: `localhost`
- Port: `3307`
- Database: `expense_management`
- User: `expense_user`
- Password: `expense_password123`

### 2. Install dependencies and start API

```powershell
cd "d:\Reimbursement management\backend"
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment Variables

The app loads `.env` if present. Typical variables:

```env
DATABASE_URL=mysql+pymysql://expense_user:expense_password123@localhost:3307/expense_management
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development
DEBUG=True
```

## Useful Commands

Run tests:

```powershell
pytest
```

Stop Docker services:

```powershell
cd "d:\Reimbursement management"
docker compose down
```

## Troubleshooting

### 1) Backend container starts but API is not reachable

Run:

```powershell
cd "d:\Reimbursement management"
docker compose ps
docker compose logs backend --tail 100
```

Confirm API at:

- http://localhost:8000
- http://localhost:8000/docs

### 2) Database connection errors

- Ensure MySQL service is healthy: `docker compose ps`.
- Verify backend DB URL points to the correct host and port.
- For local host access, this project maps MySQL to `localhost:3307`.

### 3) Port already in use

If `8000` is occupied, update backend port mapping in root `docker-compose.yml`.

### 4) Dependency install issues (local run)

Upgrade pip and retry:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5) Reset backend service only

```powershell
cd "d:\Reimbursement management"
docker compose up --build -d backend mysql
```