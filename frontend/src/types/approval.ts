export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: number;
  expense_id: number;
  approver_id: number;
  approval_order: number;
  status: ApprovalStatus;
  comments?: string;
  approved_at?: string;
  created_at: string;
}

export interface ApprovalRule {
  id: number;
  name: string;
  description?: string;
  min_amount: number;
  max_amount?: number;
  approvers: number[];
  min_approval_percentage?: number;
  required_approver_id?: number;
  is_sequential: boolean;
  is_active: boolean;
}

export interface ApprovalUpdateRequest {
  status: 'approved' | 'rejected';
  comments?: string;
}