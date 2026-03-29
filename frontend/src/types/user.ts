export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  company_id: number;
  manager_id?: number;
  is_active: boolean;
}

export interface Company {
  id: number;
  name: string;
  country: string;
  currency: string;
  created_at: string;
}