export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export const EXPENSE_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const EXPENSE_CATEGORIES = {
  FOOD: 'food',
  TRAVEL: 'travel',
  ACCOMMODATION: 'accommodation',
  MISCELLANEOUS: 'miscellaneous',
} as const;

export const APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
  },
  EXPENSES: {
    LIST: '/expenses',
    CREATE: '/expenses',
    GET: (id: number) => `/expenses/${id}`,
    UPDATE: (id: number) => `/expenses/${id}`,
    SUBMIT: (id: number) => `/expenses/${id}/submit`,
  },
  APPROVALS: {
    PENDING: '/approvals/pending',
    APPROVE: (id: number) => `/approvals/${id}/approve`,
    REJECT: (id: number) => `/approvals/${id}/reject`,
  },
} as const;