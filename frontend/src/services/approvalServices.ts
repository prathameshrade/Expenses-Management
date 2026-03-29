import api from './api';
import { Approval, ApprovalUpdateRequest } from '../types/approval';
import { ApiResponse } from '../types/api';

const approvalService = {
  async getPendingApprovals(): Promise<Approval[]> {
    const response = await api.get<ApiResponse<Approval[]>>('/approvals/pending');
    return response.data.data || [];
  },

  async approveExpense(approvalId: number, comments?: string): Promise<void> {
    const data: ApprovalUpdateRequest = {
      status: 'approved',
      comments,
    };
    await api.post(`/approvals/${approvalId}/approve`, data);
  },

  async rejectExpense(approvalId: number, comments?: string): Promise<void> {
    const data: ApprovalUpdateRequest = {
      status: 'rejected',
      comments,
    };
    await api.post(`/approvals/${approvalId}/reject`, data);
  },
};

export default approvalService;