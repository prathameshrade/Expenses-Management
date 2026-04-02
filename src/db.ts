import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "./config";

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MANAGER', 'EMPLOYEE')),
      manager_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(manager_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS approval_workflows (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      approval_mode TEXT NOT NULL CHECK(approval_mode IN ('SEQUENTIAL', 'CONDITIONAL', 'HYBRID')),
      percentage_threshold REAL,
      specific_approver_id TEXT,
      is_manager_approver INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(specific_approver_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_steps (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      label TEXT NOT NULL,
      approver_role TEXT,
      approver_user_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
      FOREIGN KEY(approver_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      amount REAL NOT NULL,
      original_currency TEXT NOT NULL,
      company_amount REAL NOT NULL,
      company_currency TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      expense_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY(employee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expense_approvals (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      approver_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('WAITING', 'PENDING', 'APPROVED', 'REJECTED')),
      comments TEXT,
      acted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY(approver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
    CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_expense_id ON expense_approvals(expense_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON expense_approvals(approver_id);
  `);
}
