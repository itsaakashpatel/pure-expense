import { Hono } from "hono";
import { asc } from "drizzle-orm";
import { categories } from "../db/schema";
import type { AppEnv } from "../types";

const categoriesRoute = new Hono<AppEnv>();

// GET /api/categories — list categories for the app's picker.
categoriesRoute.get("/", async (c) => {
  const db = c.get("db");
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return c.json(rows);
});

export default categoriesRoute;
