import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, requireRoles } from "../middleware/auth";
import { evaluateExpenseApproval } from "../services/approvalEngine";

export const approvalsRouter = Router();

approvalsRouter.use(requireAuth);

approvalsRouter.get("/approvals/pending", requireRoles("MANAGER", "ADMIN"), (req, res) => {
  const approvals = db
    .prepare(
      `SELECT ea.id, ea.expense_id, ea.step_order, ea.status, e.amount, e.original_currency, e.company_amount, e.company_currency,
              e.category, e.description, e.expense_date, u.name as employee_name
       FROM expense_approvals ea
       JOIN expenses e ON e.id = ea.expense_id
       JOIN users u ON u.id = e.employee_id
       WHERE ea.approver_id = ? AND ea.status = 'PENDING'
       ORDER BY e.created_at ASC`
    )
    .all(req.user!.id);

  return res.json({ approvals });
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().max(1000).optional(),
});

approvalsRouter.post("/approvals/:approvalId/decision", requireRoles("MANAGER", "ADMIN"), (req, res, next) => {
  try {
    const body = decisionSchema.parse(req.body);

    const approval = db
      .prepare("SELECT id, expense_id, status FROM expense_approvals WHERE id = ? AND approver_id = ?")
      .get(req.params.approvalId, req.user!.id) as { id: string; expense_id: string; status: string } | undefined;

    if (!approval) {
      return res.status(404).json({ message: "Approval request not found" });
    }

    if (approval.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending approvals can be acted on" });
    }

    db.prepare("UPDATE expense_approvals SET status = ?, comments = ?, acted_at = ? WHERE id = ?").run(
      body.decision,
      body.comments ?? null,
      new Date().toISOString(),
      approval.id
    );

    evaluateExpenseApproval(approval.expense_id);

    return res.json({ message: "Decision recorded" });
  } catch (err) {
    return next(err);
  }
});

const configureWorkflowSchema = z.object({
  name: z.string().min(2),
  approvalMode: z.enum(["SEQUENTIAL", "CONDITIONAL", "HYBRID"]),
  isManagerApprover: z.boolean().default(true),
  percentageThreshold: z.number().min(0).max(1).nullable().optional(),
  specificApproverId: z.string().uuid().nullable().optional(),
  steps: z
    .array(
      z.object({
        stepOrder: z.number().int().min(1),
        label: z.string().min(2),
        approverRole: z.enum(["MANAGER", "ADMIN"]).nullable().optional(),
        approverUserId: z.string().uuid().nullable().optional(),
      })
    )
    .default([]),
});

approvalsRouter.post("/workflows/active", requireRoles("ADMIN"), (req, res, next) => {
  try {
    const body = configureWorkflowSchema.parse(req.body);

    if (body.approvalMode !== "SEQUENTIAL" && body.percentageThreshold == null && !body.specificApproverId) {
      return res
        .status(400)
        .json({ message: "For CONDITIONAL/HYBRID, set percentageThreshold and/or specificApproverId" });
    }

    const now = new Date().toISOString();
    const workflowId = randomUUID();

    const tx = db.transaction(() => {
      db.prepare("UPDATE approval_workflows SET is_active = 0 WHERE company_id = ?").run(req.user!.companyId);

      db.prepare(
        `INSERT INTO approval_workflows
         (id, company_id, name, approval_mode, percentage_threshold, specific_approver_id, is_manager_approver, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).run(
        workflowId,
        req.user!.companyId,
        body.name,
        body.approvalMode,
        body.percentageThreshold ?? null,
        body.specificApproverId ?? null,
        body.isManagerApprover ? 1 : 0,
        now
      );

      const insertStep = db.prepare(
        `INSERT INTO workflow_steps (id, workflow_id, step_order, label, approver_role, approver_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      for (const step of body.steps) {
        if (!step.approverRole && !step.approverUserId) {
          throw new Error("Each step must include approverRole or approverUserId");
        }

        insertStep.run(
          randomUUID(),
          workflowId,
          step.stepOrder,
          step.label,
          step.approverRole ?? null,
          step.approverUserId ?? null,
          now
        );
      }
    });

    tx();

    return res.status(201).json({ message: "Workflow updated", workflowId });
  } catch (err) {
    return next(err);
  }
});

approvalsRouter.get("/workflows/active", requireRoles("ADMIN"), (req, res) => {
  const workflow = db
    .prepare(
      `SELECT id, name, approval_mode, percentage_threshold, specific_approver_id, is_manager_approver, created_at
       FROM approval_workflows
       WHERE company_id = ? AND is_active = 1
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(req.user!.companyId);

  if (!workflow) {
    return res.json({ workflow: null, steps: [] });
  }

  const steps = db
    .prepare("SELECT step_order, label, approver_role, approver_user_id FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order")
    .all((workflow as { id: string }).id);

  return res.json({ workflow, steps });
});

const overrideSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});

approvalsRouter.post("/approvals/override/:expenseId", requireRoles("ADMIN"), (req, res, next) => {
  try {
    const body = overrideSchema.parse(req.body);

    const expense = db
      .prepare("SELECT id FROM expenses WHERE id = ? AND company_id = ?")
      .get(req.params.expenseId, req.user!.companyId) as { id: string } | undefined;

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    db.prepare("UPDATE expenses SET status = ?, updated_at = ? WHERE id = ?").run(
      body.status,
      new Date().toISOString(),
      expense.id
    );

    db.prepare("UPDATE expense_approvals SET comments = COALESCE(comments, '') || ? WHERE expense_id = ?").run(
      body.reason ? `\n[ADMIN OVERRIDE] ${body.reason}` : "\n[ADMIN OVERRIDE]",
      expense.id
    );

    return res.json({ message: "Expense overridden" });
  } catch (err) {
    return next(err);
  }
});
