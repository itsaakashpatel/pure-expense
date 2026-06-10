import { Hono } from "hono";
import { parseReceiptText } from "../lib/parse-llm";
import { parseRequestSchema } from "../lib/validation";
import type { AppEnv } from "../types";

const parse = new Hono<AppEnv>();

// POST /api/parse — structure raw OCR text into receipt fields. Does not persist.
parse.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = parseRequestSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: "Invalid body", issues: result.error.issues }, 400);
  }
  try {
    const structured = await parseReceiptText(c.env, result.data.rawText);
    return c.json(structured);
  } catch (err) {
    return c.json(
      { error: "Failed to parse receipt", detail: String(err) },
      502,
    );
  }
});

export default parse;
