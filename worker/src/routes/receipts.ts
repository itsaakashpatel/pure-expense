import { Hono } from "hono";
import type { AppEnv } from "../types";

const receipts = new Hono<AppEnv>();

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/webp"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
};

// POST /api/receipts — upload a receipt photo (multipart field "file" or raw body).
// Returns { receiptKey } to attach to an expense.
receipts.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  let data: ArrayBuffer;
  let type: string;

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.formData();
    const entry = form.get("file") as Blob | string | null;
    if (!entry || typeof entry === "string") {
      return c.json({ error: "Missing 'file' field" }, 400);
    }
    type = entry.type || "image/jpeg";
    data = await entry.arrayBuffer();
  } else {
    type = contentType || "image/jpeg";
    data = await c.req.arrayBuffer();
  }

  if (!IMAGE_TYPES.has(type)) {
    return c.json({ error: `Unsupported image type: ${type}` }, 415);
  }
  if (data.byteLength === 0) {
    return c.json({ error: "Empty upload" }, 400);
  }

  const ext = EXT[type] ?? "jpg";
  const date = new Date().toISOString().slice(0, 10);
  const key = `receipts/${date}/${crypto.randomUUID()}.${ext}`;
  await c.env.RECEIPTS.put(key, data, { httpMetadata: { contentType: type } });

  return c.json({ receiptKey: key }, 201);
});

// GET /api/receipts/:key{.+} — stream a stored photo back (auth'd; bucket is private).
receipts.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.RECEIPTS.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "private, max-age=31536000");
  return new Response(object.body, { headers });
});

export default receipts;
