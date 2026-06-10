// Mirrors the Worker API shapes. Money fields are integer cents.

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
};

export type LineItem = {
  name: string;
  qty: number;
  unitPrice: number; // cents
};

export type Expense = {
  id: string;
  merchant: string;
  total: number; // cents
  tax: number; // cents
  currency: string;
  category: string;
  purchasedAt: string; // YYYY-MM-DD
  notes: string;
  receiptKey: string | null;
  rawText: string;
  createdAt: string;
};

export type ExpenseDetail = Expense & { lineItems: LineItem[] };

// Output of POST /api/parse and input draft for the review screen.
export type ParsedReceipt = {
  merchant: string;
  total: number; // cents
  tax: number; // cents
  currency: string;
  category: string;
  purchasedAt: string; // YYYY-MM-DD
  lineItems: LineItem[];
};

export type ExpenseInput = ParsedReceipt & {
  notes: string;
  receiptKey: string | null;
  rawText: string;
};

export type Summary = {
  month: string;
  total: number;
  count: number;
  previousMonthTotal: number;
  byCategory: { category: string; total: number; count: number }[];
};

export type Trends = {
  months: { month: string; total: number }[];
};

export type ExpenseFilters = {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
  min?: number;
  max?: number;
  limit?: number;
  offset?: number;
};
