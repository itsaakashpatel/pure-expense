import { loadSettings } from "@/lib/settings";
import type {
  Category,
  Expense,
  ExpenseDetail,
  ExpenseFilters,
  ExpenseInput,
  ParsedReceipt,
  Summary,
  Trends,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, token } = await loadSettings();
  if (!baseUrl || !token) {
    throw new ApiError(0, "API URL and token not set — open Settings.");
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function queryString(filters: ExpenseFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const api = {
  listCategories: () => request<Category[]>("/api/categories"),

  listExpenses: (filters: ExpenseFilters = {}) =>
    request<{ expenses: Expense[]; limit: number; offset: number }>(
      `/api/expenses${queryString(filters)}`,
    ),

  getExpense: (id: string) => request<ExpenseDetail>(`/api/expenses/${id}`),

  createExpense: (input: ExpenseInput) =>
    request<{ id: string }>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateExpense: (id: string, patch: Partial<ExpenseInput>) =>
    request<{ id: string }>(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteExpense: (id: string) =>
    request<{ id: string }>(`/api/expenses/${id}`, { method: "DELETE" }),

  parseReceipt: (rawText: string) =>
    request<ParsedReceipt>("/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText }),
    }),

  summary: (month: string) =>
    request<Summary>(`/api/summary?month=${month}`),

  trends: (months = 6) => request<Trends>(`/api/trends?months=${months}`),

  // Upload a local image file to R2; returns its receiptKey.
  async uploadReceipt(uri: string): Promise<string> {
    const form = new FormData();
    form.append("file", {
      uri,
      name: "receipt.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    const { receiptKey } = await request<{ receiptKey: string }>(
      "/api/receipts",
      { method: "POST", body: form },
    );
    return receiptKey;
  },
};

// Authenticated URL for displaying a stored receipt (token in query is fine for
// a private single-user backend; alternatively fetch with header + expo-image).
export async function receiptImageSource(receiptKey: string) {
  const { baseUrl, token } = await loadSettings();
  return {
    uri: `${baseUrl}/api/receipts/${receiptKey}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}
