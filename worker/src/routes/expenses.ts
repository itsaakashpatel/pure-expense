import { Hono } from "hono";
import { and, desc, eq, gte, like, lte, type SQL } from "drizzle-orm";
import { expenses, lineItems } from "../db/schema";
import { expenseInputSchema, expensePatchSchema } from "../lib/validation";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

// GET /api/expenses — filtered, paginated list.
// Query params: q, category, from, to, min, max (cents), limit, offset.
route.get("/", async (c) => {
  const db = c.get("db");
  const { q, category, from, to, min, max, limit, offset } = c.req.query();

  const filters: SQL[] = [];
  if (q) filters.push(like(expenses.merchant, `%${q}%`));
  if (category) filters.push(eq(expenses.category, category));
  if (from) filters.push(gte(expenses.purchasedAt, from));
  if (to) filters.push(lte(expenses.purchasedAt, to));
  if (min) filters.push(gte(expenses.total, Number(min)));
  if (max) filters.push(lte(expenses.total, Number(max)));

  const take = Math.min(Number(limit) || 50, 200);
  const skip = Number(offset) || 0;

  const rows = await db
    .select()
    .from(expenses)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(expenses.purchasedAt), desc(expenses.createdAt))
    .limit(take)
    .offset(skip);

  return c.json({ expenses: rows, limit: take, offset: skip });
});

// GET /api/expenses/:id — single expense with its line items.
route.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
  if (!expense) return c.json({ error: "Not found" }, 404);
  const items = await db
    .select()
    .from(lineItems)
    .where(eq(lineItems.expenseId, id));
  return c.json({ ...expense, lineItems: items });
});

// POST /api/expenses — create an expense (+ line items) atomically.
route.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json().catch(() => ({}));
  const result = expenseInputSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: "Invalid body", issues: result.error.issues }, 400);
  }
  const input = result.data;
  const id = crypto.randomUUID();

  const statements = [
    db.insert(expenses).values({
      id,
      merchant: input.merchant,
      total: input.total,
      tax: input.tax,
      currency: input.currency,
      category: input.category,
      purchasedAt: input.purchasedAt,
      notes: input.notes,
      receiptKey: input.receiptKey,
      rawText: input.rawText,
    }),
    ...input.lineItems.map((li) =>
      db.insert(lineItems).values({
        id: crypto.randomUUID(),
        expenseId: id,
        name: li.name,
        qty: li.qty,
        unitPrice: li.unitPrice,
      }),
    ),
  ] as const;

  await db.batch(statements as never);
  return c.json({ id }, 201);
});

// PATCH /api/expenses/:id — partial update of scalar fields (not line items).
route.patch("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const result = expensePatchSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: "Invalid body", issues: result.error.issues }, 400);
  }
  const { lineItems: _drop, ...fields } = result.data;
  if (Object.keys(fields).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }
  const updated = await db
    .update(expenses)
    .set(fields)
    .where(eq(expenses.id, id))
    .returning({ id: expenses.id });
  if (updated.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ id });
});

// DELETE /api/expenses/:id — delete expense (line items cascade).
route.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const deleted = await db
    .delete(expenses)
    .where(eq(expenses.id, id))
    .returning({ id: expenses.id });
  if (deleted.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ id });
});

export default route;
