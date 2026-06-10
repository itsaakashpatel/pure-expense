import type { DB } from "./db/client";

// Cloudflare bindings (see wrangler.jsonc).
export type Bindings = {
  DB: D1Database;
  RECEIPTS: R2Bucket;
  AI: Ai;
  AUTH_TOKEN: string;
  PARSE_MODEL: string;
  OPENAI_API_KEY?: string;
};

// Per-request values attached by middleware.
export type Variables = {
  db: DB;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
