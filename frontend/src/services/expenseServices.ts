import api from './api';
import { Expense, ExpenseCreateRequest } from '../types/expense';
import { ApiResponse } from '../types/api';

const expenseService = {
  async createExpense(data: ExpenseCreateRequest): Promise<{ id: number }> {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('description', data.description);
    formData.append('amount', data.amount.toString());
    formData.append('currency', data.currency);
    formData.append('expense_date', data.expense_date);

    if (data.receipt_file) {
      formData.append('receipt_file', data.receipt_file);
    }

    const response = await api.post<ApiResponse<{ id: number }>>('/expenses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data!;
  },

  async getExpense(id: number): Promise<Expense> {
    const response = await api.get<ApiResponse<Expense>>(`/expenses/${id}`);
    return response.data.data!;
  },

  async listExpenses(): Promise<Expense[]> {
    const response = await api.get<ApiResponse<Expense[]>>('/expenses/');
    return response.data.data || [];
  },

  async updateExpense(id: number, data: Partial<Expense>): Promise<void> {
    await api.put(`/expenses/${id}`, data);
  },

  async submitExpense(id: number): Promise<void> {
    await api.post(`/expenses/${id}/submit`, {});
  },
};

export default expenseService;