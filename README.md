# Expense Management API

A TypeScript + Express backend for company expense reimbursement with:

- Auto company + admin bootstrap on signup with country currency setup
- Role-based auth: Admin, Manager, Employee
- Expense submission in any currency with company-currency conversion
- Multi-level approvals with ordered steps
- Conditional approvals (percentage / specific approver / hybrid)
- OCR endpoint for receipt-to-draft extraction

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

## Frontend Dashboard (React)

```bash
cd client
npm install
npm run dev
```

Dashboard URL: `http://localhost:5173`

To run both API and frontend from root:

```bash
npm install
npm --prefix client install
npm run dev:all
```

API base URL: `http://localhost:4000/api`

## Core Endpoints

### Authentication

- `POST /api/signup`
- `POST /api/login`

### Admin User Management

- `GET /api/users`
- `GET /api/users/credentials` (admin only; shows email + password hash)
- `POST /api/users`
- `PATCH /api/users/:id`

### Employee Expenses

- `POST /api/expenses`
- `GET /api/expenses/my`
- `POST /api/expenses/ocr` (multipart form-data with file field `receipt`)

### Manager/Admin Approval Work

- `GET /api/approvals/pending`
- `POST /api/approvals/:approvalId/decision`
- `POST /api/approvals/override/:expenseId` (admin)

### Workflow Configuration (Admin)

- `GET /api/workflows/active`
- `POST /api/workflows/active`

Example payload:

```json
{
  "name": "Default Corporate Flow",
  "approvalMode": "HYBRID",
  "isManagerApprover": true,
  "percentageThreshold": 0.6,
  "specificApproverId": null,
  "steps": [
    { "stepOrder": 1, "label": "Finance", "approverRole": "MANAGER" },
    { "stepOrder": 2, "label": "Director", "approverRole": "ADMIN" }
  ]
}
```

## Rule Behavior

- `SEQUENTIAL`: step-by-step progression only.
- `CONDITIONAL`: all approvers can act; approval based on threshold and/or specific approver.
- `HYBRID`: sequential progression plus conditional auto-approval conditions.

## Notes

- Company default currency is set from country via REST Countries API.
- Currency conversion uses exchangerate-api.
- OCR uses Tesseract.js and returns a draft object from receipt text.
- Login data is stored in local SQLite at `data/expenses.db` (table: `users`).
- Passwords are stored as bcrypt hashes (`password_hash`), not plain text.

### View Login Data On Your PC

1. Start API: `npm run dev:api`
2. Login as admin and copy your JWT token.
3. Call credentials endpoint:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:4000/api/users/credentials
```

You can also open `data/expenses.db` with any SQLite viewer and inspect the `users` table.
