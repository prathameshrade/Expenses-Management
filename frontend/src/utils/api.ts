const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

type LoginPayload = {
  email: string;
  password: string;
};

type SignupPayload = {
  email: string;
  name: string;
  password: string;
  country: string;
  role: "admin" | "manager" | "employee";
};

type ExpensePayload = {
  amount: number;
  category: "food" | "travel" | "accommodation" | "miscellaneous";
  description: string;
  currency: string;
  expense_date: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token exists
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Request failed");
  }

  return data as T;
}

export async function login(payload: LoginPayload) {
  return request<{ access_token: string; token_type: string; user: any }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function signup(payload: SignupPayload) {
  return request<{ access_token: string; token_type: string; user: any }>(
    "/auth/signup",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function listExpenses() {
  return request<{ success: boolean; message: string; data: any[] }>(
    "/expenses",
    {
      method: "GET",
    }
  );
}

export async function createExpense(payload: ExpensePayload) {
  return request<any>(
    "/expenses",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateExpenseStatus(
  expenseId: number,
  status: "approved" | "rejected"
) {
  return request<any>(
    `/expenses/${expenseId}`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    }
  );
}
