import { z } from "zod";

// Default category set, seeded into the DB and offered to the parser.
// `id` is the glyph key the app uses to render the category icon; `color` is the
// monochrome ramp from the design system.
export const DEFAULT_CATEGORIES = [
  { id: "food", name: "Food & Dining", icon: "food", color: "#161616" },
  { id: "groceries", name: "Groceries", icon: "groceries", color: "#3A3A3D" },
  { id: "transport", name: "Transport", icon: "transport", color: "#5C5C61" },
  { id: "shopping", name: "Shopping", icon: "shopping", color: "#828289" },
  { id: "travel", name: "Travel", icon: "travel", color: "#A8A8AE" },
  { id: "utilities", name: "Utilities", icon: "utilities", color: "#CBCBD0" },
] as const;

export const CATEGORY_NAMES = DEFAULT_CATEGORIES.map((c) => c.name);

// Fallback when the parser returns an unrecognized category.
export const DEFAULT_CATEGORY = "Shopping";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const lineItemSchema = z.object({
  name: z.string().default(""),
  qty: z.number().positive().default(1),
  unitPrice: z.number().int().min(0).default(0), // cents
});

// Shape returned by the LLM parser and accepted from the app's review form.
export const expenseInputSchema = z.object({
  merchant: z.string().default(""),
  total: z.number().int().min(0).default(0), // cents
  tax: z.number().int().min(0).default(0), // cents
  currency: z.string().length(3).default("CAD"),
  category: z.string().default(DEFAULT_CATEGORY),
  purchasedAt: isoDate,
  notes: z.string().default(""),
  receiptKey: z.string().nullable().default(null),
  rawText: z.string().default(""),
  lineItems: z.array(lineItemSchema).default([]),
});

export const expensePatchSchema = expenseInputSchema.partial();

export const parseRequestSchema = z.object({
  rawText: z.string().min(1, "rawText is required"),
});

// The LLM is asked to return exactly this; we coerce/validate before trusting it.
export const parsedReceiptSchema = z.object({
  merchant: z.string().default(""),
  total: z.number().min(0).default(0), // major units from the model
  tax: z.number().min(0).default(0),
  currency: z.string().default("CAD"),
  category: z.string().default(DEFAULT_CATEGORY),
  purchasedAt: z.string().default(""),
  lineItems: z
    .array(
      z.object({
        name: z.string().default(""),
        qty: z.number().default(1),
        unitPrice: z.number().default(0),
      }),
    )
    .default([]),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ParsedReceipt = z.infer<typeof parsedReceiptSchema>;
