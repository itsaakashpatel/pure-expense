import { Hono } from "hono";
import { gte, sql } from "drizzle-orm";
import { expenses } from "../db/schema";
import type { AppEnv } from "../types";

const trends = new Hono<AppEnv>();

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// GET /api/trends?months=6 — total spent per month for the last N months
// (oldest first), zero-filled. Powers the dashboard bar chart.
trends.get("/", async (c) => {
  const db = c.get("db");
  const months = Math.min(Math.max(Number(c.req.query("months")) || 6, 1), 24);

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const startDate = `${monthKey(start)}-01`;

  const rows = await db
    .select({
      month: sql<string>`substr(${expenses.purchasedAt}, 1, 7)`,
      total: sql<number>`sum(${expenses.total})`,
    })
    .from(expenses)
    .where(gte(expenses.purchasedAt, startDate))
    .groupBy(sql`substr(${expenses.purchasedAt}, 1, 7)`);

  const totals = new Map(rows.map((r) => [r.month, Number(r.total ?? 0)]));

  const series: { month: string; total: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = monthKey(d);
    series.push({ month: key, total: totals.get(key) ?? 0 });
  }

  return c.json({ months: series });
});

export default trends;
