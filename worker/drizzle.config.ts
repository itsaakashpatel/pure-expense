import { defineConfig } from "drizzle-kit";

// Generates SQL migrations into ./migrations from src/db/schema.ts.
// Migrations are applied to D1 with `wrangler d1 migrations apply`.
export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
