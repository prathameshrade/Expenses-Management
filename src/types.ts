export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ApprovalStatus = "WAITING" | "PENDING" | "APPROVED" | "REJECTED";

export type ApprovalMode = "SEQUENTIAL" | "CONDITIONAL" | "HYBRID";

export interface AuthUser {
  id: string;
  companyId: string;
  role: UserRole;
  email: string;
  name: string;
}
