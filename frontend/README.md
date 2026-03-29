# Frontend - Reimbursement Management

React + TypeScript + Vite frontend for reimbursement workflows.

## Prerequisites

- Node.js 20+ (recommended 22+)
- npm

## Option A: Run Frontend with Docker Compose (from project root)

```powershell
cd "d:\Reimbursement management"
docker compose up --build -d frontend
```

Open:

- http://localhost:3000

## Option B: Run Frontend Locally (Vite dev server)

```powershell
cd "d:\Reimbursement management\frontend"
npm install
npm run dev
```

Open:

- http://localhost:5173

## Scripts

```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

## API Base URL (when integrating backend)

Create `.env` in the frontend folder:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Use it in code with `import.meta.env.VITE_API_BASE_URL`.

## Notes

- Docker serves a production build through Nginx on port `3000`.
- Local `npm run dev` serves Vite on port `5173`.

## Troubleshooting

### 1) `npm run dev` fails

Check versions:

```powershell
node -v
npm -v
```

Use Node 20+ (recommended 22+), then reinstall:

```powershell
if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }
npm install
npm run dev
```

### 2) Vite port conflict (`5173` already in use)

Run with a different port:

```powershell
npm run dev -- --port 5174
```

### 3) Docker frontend build fails

- Ensure Dockerfile uses Node 20+.
- Rebuild frontend image:

```powershell
cd "d:\Reimbursement management"
docker compose up --build -d frontend
```

### 4) SPA routes show 404 in Docker

Ensure Nginx is configured with:

- `try_files $uri $uri/ /index.html;`

### 5) Frontend cannot reach backend API

- Confirm backend is running on `http://localhost:8000`.
- If using env vars, set `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
