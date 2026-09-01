// Shared number formatting for the budget module.

/**
 * Magnitude only — direction is always carried by words ("Subió"/"Down"), never
 * by a minus sign the eye can miss at 11px. Callers that need a sign say so in
 * their copy.
 */
export function money(n: number, decimals = 0): string {
  const v = Number.isFinite(n) ? Math.abs(n) : 0;
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** A 0..1 fraction as a whole-percent string. */
export function percent(fraction: number): string {
  const v = Number.isFinite(fraction) ? fraction : 0;
  return `${Math.round(v * 100)}%`;
}
