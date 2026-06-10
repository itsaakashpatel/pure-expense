import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./db/client";
import { requireAuth } from "./lib/auth";
import categories from "./routes/categories";
import expenses from "./routes/expenses";
import parse from "./routes/parse";
import receipts from "./routes/receipts";
import summary from "./routes/summary";
import trends from "./routes/trends";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use("*", cors());

// Health check (unauthenticated).
app.get("/", (c) => c.json({ name: "pure-expense", ok: true }));

// Everything under /api requires the bearer token and gets a Drizzle client.
app.use("/api/*", requireAuth);
app.use("/api/*", async (c, next) => {
  c.set("db", getDb(c.env.DB));
  await next();
});

app.route("/api/categories", categories);
app.route("/api/expenses", expenses);
app.route("/api/parse", parse);
app.route("/api/receipts", receipts);
app.route("/api/summary", summary);
app.route("/api/trends", trends);

app.onError((err, c) => {
  console.error("Unhandled error", err);
  return c.json({ error: "Internal error", detail: String(err) }, 500);
});

export default app;
