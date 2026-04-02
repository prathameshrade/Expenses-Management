import { randomUUID } from "crypto";
import { db } from "../db";
import { ApprovalMode, ApprovalStatus, ExpenseStatus } from "../types";

type WorkflowRow = {
	id: string;
	company_id: string;
	approval_mode: ApprovalMode;
	percentage_threshold: number | null;
	specific_approver_id: string | null;
	is_manager_approver: number;
};

type WorkflowStepRow = {
	step_order: number;
	approver_role: string | null;
	approver_user_id: string | null;
};

type ApprovalRow = {
	id: string;
	step_order: number;
	approver_id: string;
	status: ApprovalStatus;
};

export function getActiveWorkflow(companyId: string): WorkflowRow | undefined {
	return db
		.prepare(
			`SELECT id, company_id, approval_mode, percentage_threshold, specific_approver_id, is_manager_approver
			 FROM approval_workflows
			 WHERE company_id = ? AND is_active = 1
			 ORDER BY created_at DESC
			 LIMIT 1`
		)
		.get(companyId) as WorkflowRow | undefined;
}

function getUsersByRole(companyId: string, role: string): Array<{ id: string }> {
	return db.prepare("SELECT id FROM users WHERE company_id = ? AND role = ?").all(companyId, role) as Array<{ id: string }>;
}

export function initializeExpenseApprovals(expenseId: string, companyId: string, employeeId: string) {
	const workflow = getActiveWorkflow(companyId);
	if (!workflow) {
		return;
	}

	const now = new Date().toISOString();
	const approvals: Array<{ stepOrder: number; approverId: string }> = [];

	if (workflow.is_manager_approver) {
		const employee = db.prepare("SELECT manager_id FROM users WHERE id = ? AND company_id = ?").get(employeeId, companyId) as
			| { manager_id: string | null }
			| undefined;

		if (employee?.manager_id) {
			approvals.push({ stepOrder: 1, approverId: employee.manager_id });
		}
	}

	const steps = db
		.prepare("SELECT step_order, approver_role, approver_user_id FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC")
		.all(workflow.id) as WorkflowStepRow[];

	const offset = approvals.length > 0 ? 1 : 0;
	for (const step of steps) {
		const finalStep = step.step_order + offset;
		if (step.approver_user_id) {
			approvals.push({ stepOrder: finalStep, approverId: step.approver_user_id });
		} else if (step.approver_role) {
			const users = getUsersByRole(companyId, step.approver_role);
			for (const user of users) {
				approvals.push({ stepOrder: finalStep, approverId: user.id });
			}
		}
	}

	const unique = new Set<string>();
	const deduped = approvals.filter((row) => {
		const key = `${row.stepOrder}:${row.approverId}`;
		if (unique.has(key)) {
			return false;
		}
		unique.add(key);
		return true;
	});

	const mode = workflow.approval_mode;
	const minStep = deduped.reduce((acc, x) => Math.min(acc, x.stepOrder), Number.MAX_SAFE_INTEGER);

	const insertStmt = db.prepare(
		`INSERT INTO expense_approvals (id, expense_id, step_order, approver_id, status, comments, acted_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	);

	const transaction = db.transaction(() => {
		for (const row of deduped) {
			const initialStatus: ApprovalStatus =
				mode === "SEQUENTIAL" || mode === "HYBRID"
					? row.stepOrder === minStep
						? "PENDING"
						: "WAITING"
					: "PENDING";

			insertStmt.run(randomUUID(), expenseId, row.stepOrder, row.approverId, initialStatus, null, null, now);
		}
	});

	transaction();
}

function promoteNextStep(expenseId: string) {
	const nextWaiting = db
		.prepare("SELECT MIN(step_order) as next_step FROM expense_approvals WHERE expense_id = ? AND status = 'WAITING'")
		.get(expenseId) as { next_step: number | null };

	if (nextWaiting.next_step === null) {
		return;
	}

	db.prepare("UPDATE expense_approvals SET status = 'PENDING' WHERE expense_id = ? AND step_order = ? AND status = 'WAITING'").run(
		expenseId,
		nextWaiting.next_step
	);
}

function updateExpenseStatus(expenseId: string, status: ExpenseStatus) {
	db.prepare("UPDATE expenses SET status = ?, updated_at = ? WHERE id = ?").run(status, new Date().toISOString(), expenseId);
}

function evaluateConditional(workflow: WorkflowRow, approvals: ApprovalRow[]): ExpenseStatus {
	if (approvals.length === 0) {
		return "PENDING";
	}

	const approved = approvals.filter((a) => a.status === "APPROVED");
	const decided = approvals.filter((a) => a.status === "APPROVED" || a.status === "REJECTED");

	if (workflow.specific_approver_id) {
		const specificApproved = approvals.some(
			(a) => a.approver_id === workflow.specific_approver_id && a.status === "APPROVED"
		);
		if (specificApproved) {
			return "APPROVED";
		}
	}

	if (workflow.percentage_threshold !== null) {
		const ratio = approved.length / approvals.length;
		if (ratio >= workflow.percentage_threshold) {
			return "APPROVED";
		}

		const stillPending = approvals.length - decided.length;
		const maxPossibleApprovals = approved.length + stillPending;
		if (maxPossibleApprovals / approvals.length < workflow.percentage_threshold) {
			return "REJECTED";
		}
	}

	return "PENDING";
}

function evaluateSequential(approvals: ApprovalRow[]): ExpenseStatus {
	if (approvals.some((a) => a.status === "REJECTED")) {
		return "REJECTED";
	}

	if (approvals.length > 0 && approvals.every((a) => a.status === "APPROVED")) {
		return "APPROVED";
	}

	return "PENDING";
}

function settleIfNeeded(expenseId: string, finalStatus: ExpenseStatus) {
	if (finalStatus === "APPROVED" || finalStatus === "REJECTED") {
		updateExpenseStatus(expenseId, finalStatus);

		if (finalStatus === "REJECTED") {
			db.prepare("UPDATE expense_approvals SET status = 'REJECTED' WHERE expense_id = ? AND status = 'WAITING'").run(expenseId);
			db.prepare("UPDATE expense_approvals SET status = 'REJECTED' WHERE expense_id = ? AND status = 'PENDING'").run(expenseId);
		}
	}
}

export function evaluateExpenseApproval(expenseId: string) {
	const expense = db.prepare("SELECT company_id FROM expenses WHERE id = ?").get(expenseId) as { company_id: string } | undefined;
	if (!expense) {
		throw new Error("Expense not found");
	}

	const workflow = getActiveWorkflow(expense.company_id);
	if (!workflow) {
		updateExpenseStatus(expenseId, "APPROVED");
		return;
	}

	const approvals = db
		.prepare("SELECT id, step_order, approver_id, status FROM expense_approvals WHERE expense_id = ? ORDER BY step_order ASC")
		.all(expenseId) as ApprovalRow[];

	if (workflow.approval_mode === "SEQUENTIAL") {
		const nextWaitingExists = approvals.some((a) => a.status === "WAITING");
		const pendingInCurrentStep = approvals.some((a) => a.status === "PENDING");

		if (!pendingInCurrentStep && nextWaitingExists) {
			promoteNextStep(expenseId);
		}

		const refreshed = db
			.prepare("SELECT id, step_order, approver_id, status FROM expense_approvals WHERE expense_id = ? ORDER BY step_order ASC")
			.all(expenseId) as ApprovalRow[];
		settleIfNeeded(expenseId, evaluateSequential(refreshed));
		return;
	}

	if (workflow.approval_mode === "CONDITIONAL") {
		settleIfNeeded(expenseId, evaluateConditional(workflow, approvals));
		return;
	}

	const pendingInCurrentStep = approvals.some((a) => a.status === "PENDING");
	const nextWaitingExists = approvals.some((a) => a.status === "WAITING");

	if (!pendingInCurrentStep && nextWaitingExists) {
		promoteNextStep(expenseId);
	}

	const refreshed = db
		.prepare("SELECT id, step_order, approver_id, status FROM expense_approvals WHERE expense_id = ? ORDER BY step_order ASC")
		.all(expenseId) as ApprovalRow[];

	const conditionalResult = evaluateConditional(workflow, refreshed);
	if (conditionalResult !== "PENDING") {
		settleIfNeeded(expenseId, conditionalResult);
		return;
	}

	settleIfNeeded(expenseId, evaluateSequential(refreshed));
}
