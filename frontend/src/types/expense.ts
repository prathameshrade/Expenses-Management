export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ExpenseCategory = 'food' | 'travel' | 'accommodation' | 'miscellaneous';

export interface Expense {
  id: number;
  employee_id: number;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  amount_in_base_currency?: number;
  status: ExpenseStatus;
  receipt_url?: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreateRequest {
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  receipt_file?: File;
}

export interface OCRResult {
  raw_text: string;
  parsed_data: {
    vendor?: string;
    amount?: number;
    currency?: string;
    date?: string;
    items?: string[];
  };
}