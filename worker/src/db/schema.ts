import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Monetary amounts are stored as integer minor units (cents) to avoid float
// rounding. `purchased_at` is an ISO date string (YYYY-MM-DD); created_at is a
// full ISO timestamp.

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("receipt"),
  color: text("color").notNull().default("#6B7280"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    merchant: text("merchant").notNull().default(""),
    total: integer("total").notNull().default(0), // minor units (cents)
    tax: integer("tax").notNull().default(0), // minor units (cents)
    currency: text("currency").notNull().default("CAD"),
    category: text("category").notNull().default("Shopping"),
    purchasedAt: text("purchased_at").notNull(), // YYYY-MM-DD
    notes: text("notes").notNull().default(""),
    receiptKey: text("receipt_key"), // R2 object key, null if no photo
    rawText: text("raw_text").notNull().default(""), // OCR source text
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    purchasedAtIdx: index("expenses_purchased_at_idx").on(t.purchasedAt),
    merchantIdx: index("expenses_merchant_idx").on(t.merchant),
    categoryIdx: index("expenses_category_idx").on(t.category),
  }),
);

export const lineItems = sqliteTable(
  "line_items",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    qty: real("qty").notNull().default(1),
    unitPrice: integer("unit_price").notNull().default(0), // minor units (cents)
  },
  (t) => ({
    expenseIdIdx: index("line_items_expense_id_idx").on(t.expenseId),
  }),
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type LineItem = typeof lineItems.$inferSelect;
export type NewLineItem = typeof lineItems.$inferInsert;
export type Category = typeof categories.$inferSelect;
