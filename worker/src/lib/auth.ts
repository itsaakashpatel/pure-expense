import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

// Constant-time string comparison to avoid leaking the token via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Single-user auth: every /api request must carry `Authorization: Bearer <token>`
// matching the AUTH_TOKEN secret.
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const expected = c.env.AUTH_TOKEN;
  if (!expected) {
    return c.json({ error: "Server missing AUTH_TOKEN" }, 500);
  }
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !timingSafeEqual(token, expected)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});
