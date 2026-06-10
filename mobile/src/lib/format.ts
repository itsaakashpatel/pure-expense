import { format, parseISO } from "date-fns";

// Cents → "$1,847.20" (design uses a plain $ prefix, en-CA grouping).
// `decimals: false` drops the cents; `sign: true` shows +/− for deltas.
export function money(
  cents: number,
  { decimals = true, sign = false }: { decimals?: boolean; sign?: boolean } = {},
): string {
  const neg = cents < 0;
  const v = Math.abs(cents) / 100;
  const s = v.toLocaleString("en-CA", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  const pre = sign ? (neg ? "−" : "+") : neg ? "−" : "";
  return `${pre}$${s}`;
}

// "$12.99" / "12.99" → 1299 cents. Returns 0 for unparseable input.
export function parseMoneyToCents(input: string): number {
  const n = Number(String(input).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatDate(iso: string, fmt = "MMM d, yyyy"): string {
  try {
    return format(parseISO(iso), fmt);
  } catch {
    return iso;
  }
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatMonthLabel(month: string, fmt = "MMMM yyyy"): string {
  try {
    return format(parseISO(`${month}-01`), fmt);
  } catch {
    return month;
  }
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Group label for the history list, e.g. "Today · Jun 9", "Yesterday · Jun 8", "Jun 6".
export function dayGroupLabel(iso: string): string {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  const yKey = y.toISOString().slice(0, 10);
  const short = formatDate(iso, "MMM d");
  if (iso === todayKey) return `Today · ${short}`;
  if (iso === yKey) return `Yesterday · ${short}`;
  return short;
}
