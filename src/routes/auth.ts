import { Router } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db";
import { config } from "../config";
import { getCountryCurrency } from "../services/currencyService";

export const authRouter = Router();

const signupSchema = z.object({
  companyName: z.string().min(2),
  country: z.string().min(2),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post("/signup", async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body);

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(body.email) as { id: string } | undefined;
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const companyId = randomUUID();
    const adminId = randomUUID();
    const workflowId = randomUUID();
    const now = new Date().toISOString();

    const currency = await getCountryCurrency(body.country);
    const passwordHash = await bcrypt.hash(body.password, 10);

    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO companies (id, name, country, currency, created_at) VALUES (?, ?, ?, ?, ?)").run(
        companyId,
        body.companyName,
        body.country,
        currency,
        now
      );

      db.prepare(
        "INSERT INTO users (id, company_id, name, email, password_hash, role, manager_id, created_at) VALUES (?, ?, ?, ?, ?, 'ADMIN', NULL, ?)"
      ).run(adminId, companyId, body.adminName, body.email, passwordHash, now);

      db.prepare(
        `INSERT INTO approval_workflows
         (id, company_id, name, approval_mode, percentage_threshold, specific_approver_id, is_manager_approver, is_active, created_at)
         VALUES (?, ?, 'Default Workflow', 'SEQUENTIAL', NULL, NULL, 1, 1, ?)`
      ).run(workflowId, companyId, now);
    });

    transaction();

    const token = jwt.sign(
      { id: adminId, companyId, role: "ADMIN", email: body.email, name: body.adminName },
      config.jwtSecret,
      { expiresIn: "12h" }
    );

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: { id: adminId, name: body.adminName, email: body.email, role: "ADMIN" },
      company: { id: companyId, name: body.companyName, country: body.country, currency },
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = db
      .prepare(
        `SELECT id, company_id, name, email, password_hash, role
         FROM users
         WHERE email = ?`
      )
      .get(body.email) as
      | {
          id: string;
          company_id: string;
          name: string;
          email: string;
          password_hash: string;
          role: "ADMIN" | "MANAGER" | "EMPLOYEE";
        }
      | undefined;

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, companyId: user.company_id, role: user.role, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: "12h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
});
