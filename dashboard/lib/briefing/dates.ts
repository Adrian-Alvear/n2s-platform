// Pure date logic for the upcoming briefing: which recurring bill fires when,
// and what a calendar month means for the household.
//
// Two rules shape everything here:
//
//  1. The household lives in America/Toronto, but the briefing runs in a
//     Cloudflare Worker whose local time is UTC. Anything computed with
//     `new Date(year, month, ...)` or `getDate()` would silently be a UTC
//     calendar day, which is wrong for the 4-5 hours after Toronto midnight.
//     So every civil-date decision goes through Intl.DateTimeFormat with
//     timeZone "America/Toronto".
//
//  2. "2 days before due" is a *calendar day* count, not 48 hours. Across a
//     DST transition a day is 23 or 25 hours long, so subtracting timestamps
//     would drop or add a reminder twice a year.
//
// Every function takes an explicit reference Date — none of them reads the
// system clock — so the briefing is reproducible and testable.
//
// `month` is zero-based (0 = January), matching the JS Date convention already
// used across lib/ and the budget pages.

const TIME_ZONE = "America/Toronto";

const MS_PER_DAY = 86_400_000;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

type CivilDate = { year: number; month: number; day: number };

// The wall-clock date/time an instant reads as in Toronto.
function torontoParts(date: Date): CivilDate & { hour: number; minute: number; second: number } {
  const parts: Record<string, string> = {};
  for (const { type, value } of partsFormatter.formatToParts(date)) parts[type] = value;
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    // Intl renders midnight as hour 24 in the h23-ish en-US pattern; normalise.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

// Toronto's UTC offset (ms to add to UTC to get local) at a given instant.
function torontoOffsetMs(utcMs: number): number {
  const p = torontoParts(new Date(utcMs));
  return Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second) - utcMs;
}

// The instant at which Toronto's wall clock reads the given civil midnight.
// Two passes: guess with the offset in force at the naive timestamp, then
// re-check with the offset actually in force at the guessed instant, which
// matters when the guess lands on the far side of a DST transition.
function torontoStartOfDay(year: number, month: number, day: number): Date {
  const naive = Date.UTC(year, month, day);
  const utc = naive - torontoOffsetMs(naive);
  return new Date(naive - torontoOffsetMs(utc));
}

// A day number for a civil date, so two dates can be subtracted as calendar
// days with no DST arithmetic involved.
function dayIndex(d: CivilDate): number {
  return Date.UTC(d.year, d.month, d.day) / MS_PER_DAY;
}

/**
 * Clamp a nominal day-of-month to a day that actually exists in that month.
 * Rent nominally due on the 31st falls on the 30th in April and the 28th or
 * 29th in February; without this it would silently never fire in the seven
 * months that are shorter than 31 days.
 */
export function clampDayOfMonth(year: number, month: number, dayOfMonth: number): number {
  // Day 0 of the following month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(Math.max(Math.trunc(dayOfMonth), 1), lastDay);
}

/**
 * The next occurrence of a recurring day-of-month at or after `from`, as the
 * start of that day in Toronto. If the day is still ahead this month (or is
 * today) it stays in this month; otherwise it rolls into the next one, clamped
 * again because the next month may be shorter.
 */
export function nextDueDate(dayOfMonth: number, from: Date): Date {
  const today = torontoParts(from);
  const dueThisMonth = clampDayOfMonth(today.year, today.month, dayOfMonth);
  if (today.day <= dueThisMonth) {
    return torontoStartOfDay(today.year, today.month, dueThisMonth);
  }
  const year = today.month === 11 ? today.year + 1 : today.year;
  const month = (today.month + 1) % 12;
  return torontoStartOfDay(year, month, clampDayOfMonth(year, month, dayOfMonth));
}

/**
 * Whether a bill recurring on `dayOfMonth` is due exactly `days` calendar days
 * after `from`, as counted in Toronto. A bill due at any hour of the target day
 * counts, and a day spanning a DST transition still counts as one day.
 */
export function isDueInDays(dayOfMonth: number, from: Date, days: number): boolean {
  const due = nextDueDate(dayOfMonth, from);
  return dayIndex(torontoParts(due)) - dayIndex(torontoParts(from)) === days;
}

/**
 * Half-open [start, end) bounds of a calendar month as the household in Toronto
 * experiences it, as UTC ISO strings ready for a Supabase timestamptz range
 * query. The offset baked into the result is whichever of EST (-05:00) or EDT
 * (-04:00) is in force on the first of each month, so entries logged in the
 * hours right after Toronto midnight land in the right month even though the
 * Worker itself runs in UTC.
 */
export function monthBoundsToronto(
  year: number,
  month: number,
): { startISO: string; endISO: string } {
  return {
    startISO: torontoStartOfDay(year, month, 1).toISOString(),
    endISO: torontoStartOfDay(year, month + 1, 1).toISOString(),
  };
}
