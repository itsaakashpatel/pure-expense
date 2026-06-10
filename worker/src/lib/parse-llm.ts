import type { Bindings } from "../types";
import {
  CATEGORY_NAMES,
  DEFAULT_CATEGORY,
  parsedReceiptSchema,
  type ParsedReceipt,
} from "./validation";

// Output shape returned to the app: amounts in cents, date normalized.
export type StructuredReceipt = {
  merchant: string;
  total: number; // cents
  tax: number; // cents
  currency: string;
  category: string;
  purchasedAt: string; // YYYY-MM-DD
  lineItems: { name: string; qty: number; unitPrice: number }[]; // unitPrice cents
};

// JSON schema the model must conform to (Workers AI structured output).
const RECEIPT_JSON_SCHEMA = {
  type: "object",
  properties: {
    merchant: { type: "string" },
    total: { type: "number" },
    tax: { type: "number" },
    currency: { type: "string" },
    purchasedAt: { type: "string" },
    category: { type: "string", enum: [...CATEGORY_NAMES] },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          qty: { type: "number" },
          unitPrice: { type: "number" },
        },
        required: ["name", "qty", "unitPrice"],
      },
    },
  },
  required: ["merchant", "total", "tax", "currency", "purchasedAt", "category", "lineItems"],
} as const;

function systemPrompt(): string {
  return [
    "You convert raw OCR text from a shopping receipt into JSON.",
    "Return ONLY a JSON object, no markdown, no commentary.",
    "Fields:",
    '  merchant (string), total (number, grand total), tax (number),',
    '  currency (ISO 4217 like USD/EUR/GBP), purchasedAt (YYYY-MM-DD),',
    `  category (one of: ${CATEGORY_NAMES.join(", ")}),`,
    "  lineItems (array of {name, qty, unitPrice}).",
    "Amounts are in major units (e.g. 12.99). If a field is unknown use an empty",
    'string, 0, or "Other" for category. Pick the single best category.',
  ].join("\n");
}

// Extract the first balanced {...} JSON object from a model response.
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in model output");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("Unterminated JSON object in model output");
}

const toCents = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100);

function normalizeDate(input: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!input) return today;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? today : parsed.toISOString().slice(0, 10);
}

function normalizeCategory(input: string): string {
  const match = CATEGORY_NAMES.find(
    (c) => c.toLowerCase() === input.trim().toLowerCase(),
  );
  return match ?? DEFAULT_CATEGORY;
}

function toStructured(parsed: ParsedReceipt): StructuredReceipt {
  return {
    merchant: parsed.merchant.trim(),
    total: toCents(parsed.total),
    tax: toCents(parsed.tax),
    currency: (parsed.currency || "CAD").toUpperCase().slice(0, 3),
    category: normalizeCategory(parsed.category),
    purchasedAt: normalizeDate(parsed.purchasedAt),
    lineItems: parsed.lineItems.map((li) => ({
      name: li.name.trim(),
      qty: li.qty || 1,
      unitPrice: toCents(li.unitPrice),
    })),
  };
}

// Structure OCR text into a receipt. Uses Workers AI by default; swap providers
// here without touching the route.
export async function parseReceiptText(
  env: Bindings,
  rawText: string,
): Promise<StructuredReceipt> {
  const response = (await env.AI.run(env.PARSE_MODEL as keyof AiModels, {
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: rawText.slice(0, 6000) },
    ],
    // Constrain the model to emit JSON matching this schema.
    response_format: { type: "json_schema", json_schema: RECEIPT_JSON_SCHEMA },
    temperature: 0.1,
  } as never)) as { response?: string | object };

  // Workers AI may return `response` as a parsed object or a JSON string.
  let parsedJson: unknown;
  if (response.response && typeof response.response === "object") {
    parsedJson = response.response;
  } else {
    try {
      parsedJson = extractJson(String(response.response ?? ""));
    } catch {
      parsedJson = {};
    }
  }
  const parsed = parsedReceiptSchema.parse(parsedJson);
  return toStructured(parsed);
}
