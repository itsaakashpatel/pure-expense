import { Hono } from "hono";
import { and, gte, lte, sql } from "drizzle-orm";
import { expenses } from "../db/schema";
import type { AppEnv } from "../types";

const summary = new Hono<AppEnv>();

// Returns the inclusive [first, last] day strings for a YYYY-MM month, plus the
// same for the previous month.
function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(lastDay).padStart(2, "0")}`;
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const prevMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  return { first, last, prevFirst: `${prevMonth}-01`, prevLast: `${prevMonth}-31` };
}

// GET /api/summary?month=YYYY-MM — total, per-category breakdown, prev-month total.
summary.get("/", async (c) => {
  const db = c.get("db");
  const month = c.req.query("month") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return c.json({ error: "month must be YYYY-MM" }, 400);
  }
  const { first, last, prevFirst, prevLast } = monthRange(month);

  const inMonth = and(
    gte(expenses.purchasedAt, first),
    lte(expenses.purchasedAt, last),
  );

  const byCategory = await db
    .select({
      category: expenses.category,
      total: sql<number>`sum(${expenses.total})`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .where(inMonth)
    .groupBy(expenses.category)
    .orderBy(sql`sum(${expenses.total}) desc`);

  const total = byCategory.reduce((sum, r) => sum + Number(r.total ?? 0), 0);
  const count = byCategory.reduce((sum, r) => sum + Number(r.count ?? 0), 0);

  const [prev] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.total}), 0)` })
    .from(expenses)
    .where(
      and(gte(expenses.purchasedAt, prevFirst), lte(expenses.purchasedAt, prevLast)),
    );

  return c.json({
    month,
    total,
    count,
    previousMonthTotal: Number(prev?.total ?? 0),
    byCategory: byCategory.map((r) => ({
      category: r.category,
      total: Number(r.total ?? 0),
      count: Number(r.count ?? 0),
    })),
  });
});

export default summary;
