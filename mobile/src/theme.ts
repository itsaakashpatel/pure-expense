// Design tokens ported from docs/designs/v1/styles.css — a light, monochrome
// system on the Schibsted Grotesk typeface.

export const colors = {
  ink: "#0A0A0A",
  ink2: "#5E5E63",
  ink3: "#9A9AA0",
  canvas: "#F4F4F5",
  surface: "#FFFFFF",
  hair: "#ECECEE",
  hair2: "#F3F3F4",
  accent: "#0A0A0A",
  accentInk: "#FFFFFF",
  // monochrome category ramp
  food: "#161616",
  groceries: "#3A3A3D",
  transport: "#5C5C61",
  shopping: "#828289",
  travel: "#A8A8AE",
  utilities: "#CBCBD0",
};

export const radius = { lg: 22, md: 14, pill: 999 };

export const fonts = {
  regular: "SchibstedGrotesk_400Regular",
  medium: "SchibstedGrotesk_500Medium",
  semibold: "SchibstedGrotesk_600SemiBold",
  bold: "SchibstedGrotesk_700Bold",
  extrabold: "SchibstedGrotesk_800ExtraBold",
};

// Map a category name OR glyph-key to its ramp color + glyph key. The API also
// supplies these per category, but this is the static fallback used across the app.
const CATEGORY_META: Record<string, { color: string; glyph: string }> = {
  "Food & Dining": { color: colors.food, glyph: "food" },
  Groceries: { color: colors.groceries, glyph: "groceries" },
  Transport: { color: colors.transport, glyph: "transport" },
  Shopping: { color: colors.shopping, glyph: "shopping" },
  Travel: { color: colors.travel, glyph: "travel" },
  Utilities: { color: colors.utilities, glyph: "utilities" },
};

export function categoryMeta(name: string): { color: string; glyph: string } {
  return CATEGORY_META[name] ?? { color: colors.shopping, glyph: "shopping" };
}
