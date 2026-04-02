import fs from "fs";
import path from "path";
import { Router } from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, requireRoles } from "../middleware/auth";
import { convertCurrency, companyCurrency } from "../services/currencyService";
import { initializeExpenseApprovals } from "../services/approvalEngine";
import { extractExpenseFromReceipt } from "../services/ocrService";

export const expensesRouter = Router();

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  category: z.string().min(2),
  description: z.string().min(2),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

expensesRouter.use(requireAuth);

expensesRouter.post("/expenses", requireRoles("EMPLOYEE"), async (req, res, next) => {
  try {
    const body = createExpenseSchema.parse(req.body);

    const expenseId = randomUUID();
    const companyCurr = companyCurrency(req.user!.companyId);
    const companyAmount = await convertCurrency(body.amount, body.currency.toUpperCase(), companyCurr);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO expenses
       (id, company_id, employee_id, amount, original_currency, company_amount, company_currency, category, description, expense_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`
    ).run(
      expenseId,
      req.user!.companyId,
      req.user!.id,
      body.amount,
      body.currency.toUpperCase(),
      companyAmount,
      companyCurr,
      body.category,
      body.description,
      body.expenseDate,
      now,
      now
    );

    initializeExpenseApprovals(expenseId, req.user!.companyId, req.user!.id);

    return res.status(201).json({ message: "Expense submitted", expenseId });
  } catch (err) {
    return next(err);
  }
});

expensesRouter.get("/expenses/my", requireRoles("EMPLOYEE"), (req, res) => {
  const expenses = db
    .prepare(
      `SELECT id, amount, original_currency, company_amount, company_currency, category, description, expense_date, status, created_at
       FROM expenses
       WHERE employee_id = ?
       ORDER BY created_at DESC`
    )
    .all(req.user!.id);

  res.json({ expenses });
});

expensesRouter.get("/expenses/team", requireRoles("MANAGER", "ADMIN"), (req, res) => {
  if (req.user!.role === "ADMIN") {
    const expenses = db
      .prepare(
        `SELECT e.*, u.name as employee_name
         FROM expenses e
         JOIN users u ON u.id = e.employee_id
         WHERE e.company_id = ?
         ORDER BY e.created_at DESC`
      )
      .all(req.user!.companyId);
    return res.json({ expenses });
  }

  const expenses = db
    .prepare(
      `SELECT e.*, u.name as employee_name
       FROM expenses e
       JOIN users u ON u.id = e.employee_id
       WHERE u.manager_id = ? AND e.company_id = ?
       ORDER BY e.created_at DESC`
    )
    .all(req.user!.id, req.user!.companyId);

  return res.json({ expenses });
});

expensesRouter.post("/expenses/ocr", requireRoles("EMPLOYEE"), upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "receipt file is required" });
    }

    const parsed = await extractExpenseFromReceipt(req.file.path);
    return res.json({ draft: parsed });
  } catch (err) {
    return next(err);
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});
