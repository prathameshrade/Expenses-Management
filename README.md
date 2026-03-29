# Reimbursement Management System

Full-stack reimbursement management application with:

- FastAPI backend
- React + Vite frontend
- MySQL database

## Quick Start (Docker, Recommended)

Run all services from the project root:

```powershell
cd "d:\Reimbursement management"
docker compose up --build -d
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Backend Swagger: http://localhost:8000/docs

Current Docker ports:

- Frontend: `3000 -> 80`
- Backend: `8000 -> 8000`
- MySQL: `3307 -> 3306`

Stop services:

```powershell
docker compose down
```

Check status/logs:

```powershell
docker compose ps
docker compose logs -f
```

## Run Locally (Without Docker for App Services)

### 1. Start MySQL only (Docker)

```powershell
cd "d:\Reimbursement management"
docker compose up -d mysql
```

### 2. Run backend

```powershell
cd "d:\Reimbursement management\backend"
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URLs:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs

### 3. Run frontend

```powershell
cd "d:\Reimbursement management\frontend"
npm install
npm run dev
```

Frontend URL:

- http://localhost:5173

## Notes

- If `3307` is already occupied, update the MySQL host port in `docker-compose.yml`.
- Frontend currently has pages using local browser storage; backend integration can be expanded further.

## Troubleshooting

### 1) Docker compose fails to start

Check container status and logs:

```powershell
docker compose ps
docker compose logs -f
```

If needed, clean and rebuild:

```powershell
docker compose down
docker compose up --build -d
```

### 2) Port already in use

If you see bind errors (for example `3306` or `3000`):

- Change host-side port mapping in `docker-compose.yml`.
- Example used in this project: MySQL `3307:3306`.

### 3) Frontend Docker build error (Node/Vite mismatch)

If Vite reports unsupported Node version:

- Use Node 20+ (recommended 22+) in frontend Docker image.
- Rebuild images: `docker compose up --build -d`.

### 4) Backend not reachable from browser

- Confirm backend container is running on `8000`.
- Open `http://localhost:8000/docs` directly to verify API is up.

### 5) Fresh start (reset running stack)

```powershell
docker compose down
docker compose up --build -d
```
