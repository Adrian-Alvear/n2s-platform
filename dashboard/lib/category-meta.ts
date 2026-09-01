// Presentation metadata for the spending categories.
//
// The emoji map lived duplicated in the budget page and in the envelope list,
// which meant a new category could show up with an icon in one place and a gap
// in the other. It lives here once now.

/**
 * Categorical colour slots for charts. Assigned in fixed order and never
 * cycled, per the palette rules in globals.css. A sixth colour would have to be
 * validated first, so anything past five is rolled up rather than coloured.
 */
export const CHART_SLOTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** The neutral fill for a rolled-up "everything else" slice. */
export const ROLLUP_COLOR = "var(--muted-foreground)";

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠",
  Carro: "🚗",
  Seguro: "🛡️",
  Internet: "📡",
  Agua: "💧",
  Gas: "🔥",
  Gasolina: "⛽",
  "Renta Calentador": "🌡️",
  "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️",
  Cumpleaños: "🎂",
  "Transporte Uber": "🚕",
  "Mto Carro": "🔧",
  Otros: "📦",
};

/** Falls back to the generic parcel so a stray category never renders blank. */
export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "📦";
}
