import { Router } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, requireRoles } from "../middleware/auth";

export const usersRouter = Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["EMPLOYEE", "MANAGER"]),
  managerId: z.string().uuid().nullable().optional(),
});

const updateUserSchema = z.object({
  role: z.enum(["EMPLOYEE", "MANAGER"]).optional(),
  managerId: z.string().uuid().nullable().optional(),
});

usersRouter.use(requireAuth);

usersRouter.get("/users", requireRoles("ADMIN"), (req, res) => {
  const users = db
    .prepare(
      `SELECT id, name, email, role, manager_id, created_at
       FROM users
       WHERE company_id = ?
       ORDER BY created_at DESC`
    )
    .all(req.user!.companyId);

  res.json({ users });
});

usersRouter.get("/users/credentials", requireRoles("ADMIN"), (req, res) => {
  const credentials = db
    .prepare(
      `SELECT id, name, email, password_hash, role, created_at
       FROM users
       WHERE company_id = ?
       ORDER BY created_at DESC`
    )
    .all(req.user!.companyId) as Array<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: "ADMIN" | "MANAGER" | "EMPLOYEE";
      created_at: string;
    }>;

  res.json({
    message: "Stored login data from local SQLite database",
    note: "Passwords are stored as secure bcrypt hashes, not plain text.",
    credentials,
  });
});

usersRouter.post("/users", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(body.email) as { id: string } | undefined;
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (body.managerId) {
      const manager = db
        .prepare("SELECT id, role FROM users WHERE id = ? AND company_id = ?")
        .get(body.managerId, req.user!.companyId) as { id: string; role: string } | undefined;
      if (!manager || manager.role !== "MANAGER") {
        return res.status(400).json({ message: "managerId must reference a manager in your company" });
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const id = randomUUID();

    db.prepare(
      `INSERT INTO users (id, company_id, name, email, password_hash, role, manager_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.user!.companyId, body.name, body.email, passwordHash, body.role, body.managerId ?? null, new Date().toISOString());

    return res.status(201).json({
      message: "User created",
      user: { id, name: body.name, email: body.email, role: body.role, managerId: body.managerId ?? null },
    });
  } catch (err) {
    return next(err);
  }
});

usersRouter.patch("/users/:id", requireRoles("ADMIN"), (req, res, next) => {
  try {
    const body = updateUserSchema.parse(req.body);
    const userId = req.params.id;

    const target = db
      .prepare("SELECT id, role FROM users WHERE id = ? AND company_id = ?")
      .get(userId, req.user!.companyId) as { id: string; role: string } | undefined;

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (body.managerId) {
      const manager = db
        .prepare("SELECT id, role FROM users WHERE id = ? AND company_id = ?")
        .get(body.managerId, req.user!.companyId) as { id: string; role: string } | undefined;
      if (!manager || manager.role !== "MANAGER") {
        return res.status(400).json({ message: "managerId must reference a manager in your company" });
      }
    }

    const role = body.role ?? target.role;
    const managerId = body.managerId === undefined ? null : body.managerId;

    db.prepare("UPDATE users SET role = ?, manager_id = ? WHERE id = ? AND company_id = ?").run(
      role,
      managerId,
      userId,
      req.user!.companyId
    );

    return res.json({ message: "User updated" });
  } catch (err) {
    return next(err);
  }
});
