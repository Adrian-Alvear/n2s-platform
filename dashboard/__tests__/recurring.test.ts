import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@/lib/budget-analytics";
import { detectRecurring, recurringSignature, summarizeRecurring } from "@/lib/recurring";

let nextId = 1;

/**
 * Timestamps are written without a trailing Z on purpose: `new Date()` parses
 * them in the local zone, which is what the detector reads, so these tests do
 * not shift a day when the machine's zone changes.
 */
function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: nextId++,
    expense_at: "2026-09-05T12:00:00",
    description: "Mercado",
    category: "Comida y Aseo",
    amount: 50,
    member: "Adrian",
    ...over,
  };
}

/** A bill on the same day of every month from `startMonth` for `count` months. */
function monthly(
  over: Partial<LedgerEntry>,
  startMonth: number,
  count: number,
  day = 3,
  year = 2026,
): LedgerEntry[] {
  return Array.from({ length: count }, (_, i) =>
    entry({
      ...over,
      expense_at: `${year}-${String(startMonth + i).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00`,
    }),
  );
}

const NOW = new Date(2026, 8, 15, 12, 0, 0); // 15 September 2026

describe("recurringSignature", () => {
  it("folds case and accents", () => {
    expect(recurringSignature("Cumpleaños", "Cumpleaños")).toBe(
      recurringSignature("cumpleanos", "Cumpleaños"),
    );
  });

  it("drops the month word so the same bill groups across months", () => {
    expect(recurringSignature("Arriendo mayo", "Arriendo")).toBe(
      recurringSignature("Arriendo junio", "Arriendo"),
    );
    expect(recurringSignature("Rent January", "Arriendo")).toBe(
      recurringSignature("Rent August", "Arriendo"),
    );
  });

  it("drops digits so an invoice number does not split a series", () => {
    expect(recurringSignature("Internet 8891", "Internet")).toBe(
      recurringSignature("Internet 4402", "Internet"),
    );
  });

  it("ignores word order and repetition", () => {
    expect(recurringSignature("Pago Internet", "Internet")).toBe(
      recurringSignature("internet internet", "Internet"),
    );
  });

  it("keeps genuinely different descriptions apart", () => {
    expect(recurringSignature("Arriendo", "Arriendo")).not.toBe(
      recurringSignature("Seguro", "Seguro"),
    );
  });

  it("falls back to the category when nothing survives", () => {
    expect(recurringSignature("2026", "Cumpleaños")).toBe("cumpleanos");
    expect(recurringSignature("", "Gas")).toBe("gas");
  });

  it("never returns undefined for missing input", () => {
    expect(recurringSignature(undefined as unknown as string, "Gas")).toBe("gas");
    expect(recurringSignature("Gas", undefined as unknown as string)).toBe("gas");
  });
});

describe("detectRecurring", () => {
  it("returns nothing for an empty ledger", () => {
    expect(detectRecurring([], 2026, 8, NOW)).toEqual([]);
  });

  it("needs the minimum number of prior months", () => {
    const two = monthly({ description: "Internet", category: "Internet", amount: 81 }, 7, 2);
    expect(detectRecurring(two, 2026, 8, NOW)).toEqual([]);

    const three = monthly({ description: "Internet", category: "Internet", amount: 81 }, 6, 3);
    expect(detectRecurring(three, 2026, 8, NOW)).toHaveLength(1);
  });

  it("honours a custom minMonths", () => {
    const two = monthly({ description: "Internet", category: "Internet", amount: 81 }, 7, 2);
    expect(detectRecurring(two, 2026, 8, NOW, { minMonths: 2 })).toHaveLength(1);
  });

  it("ignores the viewed month as evidence", () => {
    // Three sightings, but one of them is the month being judged.
    const rows = monthly({ description: "Internet", category: "Internet", amount: 81 }, 7, 3);
    expect(detectRecurring(rows, 2026, 8, NOW)).toEqual([]);
  });

  it("ignores rows outside the lookback window", () => {
    const old = monthly({ description: "Gimnasio", category: "Otros", amount: 40 }, 1, 3, 3);
    expect(detectRecurring(old, 2026, 8, NOW)).toEqual([]);
  });

  it("drops a commitment that stopped more than two months ago", () => {
    // Paid March, April, May; nothing since. September should not nag about it.
    const cancelled = monthly({ description: "Gimnasio", category: "Otros", amount: 40 }, 3, 3);
    expect(detectRecurring(cancelled, 2026, 8, NOW)).toEqual([]);
  });

  it("keeps a commitment last seen two months ago", () => {
    const rows = monthly({ description: "Gimnasio", category: "Otros", amount: 40 }, 5, 3);
    expect(detectRecurring(rows, 2026, 8, NOW)).toHaveLength(1);
  });

  it("counts the prior months it was seen in, against the window", () => {
    const rows = monthly({ description: "Internet", category: "Internet", amount: 81 }, 5, 4);
    const [s] = detectRecurring(rows, 2026, 8, NOW);
    expect(s.monthsSeen).toBe(4);
    expect(s.monthsWindow).toBe(6);
  });

  it("takes the typical amount as the median of the monthly totals", () => {
    const rows = [
      ...monthly({ description: "Agua", category: "Agua", amount: 100 }, 5, 1),
      ...monthly({ description: "Agua", category: "Agua", amount: 140 }, 6, 1),
      ...monthly({ description: "Agua", category: "Agua", amount: 900 }, 7, 1),
    ];
    // The median ignores the outlier month the way a mean would not.
    expect(detectRecurring(rows, 2026, 8, NOW)[0].typical).toBe(140);
  });

  it("sums several charges inside one month into that month's total", () => {
    const rows = [
      ...monthly({ description: "Arriendo", category: "Arriendo", amount: 1000 }, 5, 3, 3),
      ...monthly({ description: "Arriendo", category: "Arriendo", amount: 1950 }, 5, 3, 18),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW)[0].typical).toBe(2950);
  });

  it("marks a steady amount as fixed and a swinging one as not", () => {
    const steady = monthly({ description: "Internet", category: "Internet", amount: 81.3 }, 5, 4);
    expect(detectRecurring(steady, 2026, 8, NOW)[0].fixed).toBe(true);

    const swinging = [
      ...monthly({ description: "Gasolina", category: "Gasolina", amount: 40 }, 5, 1),
      ...monthly({ description: "Gasolina", category: "Gasolina", amount: 220 }, 6, 1),
      ...monthly({ description: "Gasolina", category: "Gasolina", amount: 90 }, 7, 1),
    ];
    expect(detectRecurring(swinging, 2026, 8, NOW)[0].fixed).toBe(false);
  });

  it("treats a sub-dollar drift on a small bill as fixed", () => {
    const rows = [
      ...monthly({ description: "Agua", category: "Agua", amount: 5 }, 5, 1),
      ...monthly({ description: "Agua", category: "Agua", amount: 5.4 }, 6, 1),
      ...monthly({ description: "Agua", category: "Agua", amount: 4.7 }, 7, 1),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW)[0].fixed).toBe(true);
  });

  it("takes the expected day from the first charge of each month", () => {
    const rows = [
      ...monthly({ description: "Seguro", category: "Seguro", amount: 384 }, 5, 3, 7),
      // A second, later charge in one of those months must not move the day.
      entry({ description: "Seguro", category: "Seguro", amount: 384, expense_at: "2026-06-25T09:00:00" }),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW)[0].expectedDay).toBe(7);
  });

  it("keeps the expected day inside a real calendar range", () => {
    const rows = monthly({ description: "Seguro", category: "Seguro", amount: 384 }, 5, 3, 28);
    const day = detectRecurring(rows, 2026, 8, NOW)[0].expectedDay;
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it("reports the newest sighting as lastSeen", () => {
    const rows = monthly({ description: "Internet", category: "Internet", amount: 81 }, 5, 4);
    expect(detectRecurring(rows, 2026, 8, NOW)[0].lastSeen).toBe("2026-08-03T09:00:00");
  });

  it("labels the series with the wording used most often", () => {
    const rows = [
      ...monthly({ description: "Arriendo", category: "Arriendo", amount: 2950 }, 5, 3),
      entry({ description: "arriendo (transferencia)", category: "Arriendo", amount: 2950, expense_at: "2026-08-04T09:00:00" }),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW)[0].label).toBe("Arriendo");
  });

  it("credits the member who pays it most often", () => {
    const rows = [
      ...monthly({ description: "Internet", category: "Internet", amount: 81, member: "Javi" }, 5, 3),
      entry({ description: "Internet", category: "Internet", amount: 81, member: "Yazmi", expense_at: "2026-08-20T09:00:00" }),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW)[0].topMember).toBe("Javi");
  });

  it("keeps two categories apart even with the same description", () => {
    const rows = [
      ...monthly({ description: "Pago", category: "Internet", amount: 81 }, 5, 4),
      ...monthly({ description: "Pago", category: "Agua", amount: 140 }, 5, 4),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW)).toHaveLength(2);
  });

  it("skips rows with an unparseable date instead of throwing", () => {
    const rows = [
      ...monthly({ description: "Internet", category: "Internet", amount: 81 }, 5, 4),
      entry({ description: "Internet", category: "Internet", amount: 81, expense_at: "not a date" }),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW)).toHaveLength(1);
  });

  it("reads string amounts from the database as numbers", () => {
    const rows = monthly(
      { description: "Internet", category: "Internet", amount: "81" as unknown as number },
      5,
      4,
    );
    expect(detectRecurring(rows, 2026, 8, NOW)[0].typical).toBe(81);
  });
});

describe("detectRecurring status", () => {
  const history = monthly({ description: "Internet", category: "Internet", amount: 81 }, 5, 4, 5);

  it("is paid once the viewed month has the charge", () => {
    const rows = [
      ...history,
      entry({ description: "Internet", category: "Internet", amount: 81, expense_at: "2026-09-05T09:00:00" }),
    ];
    const s = detectRecurring(rows, 2026, 8, NOW)[0];
    expect(s.status).toBe("paid");
    expect(s.currentAmount).toBe(81);
    expect(s.currentCount).toBe(1);
  });

  it("is late in the current month once the usual day plus grace has passed", () => {
    // Expected on the 5th, today is the 15th, nothing charged.
    const s = detectRecurring(history, 2026, 8, NOW)[0];
    expect(s.status).toBe("late");
    expect(s.currentAmount).toBe(0);
  });

  it("is still due inside the grace window", () => {
    const s = detectRecurring(history, 2026, 8, new Date(2026, 8, 7, 12))[0];
    expect(s.status).toBe("due");
  });

  it("honours a custom grace window", () => {
    const s = detectRecurring(history, 2026, 8, new Date(2026, 8, 7, 12), { graceDays: 0 })[0];
    expect(s.status).toBe("late");
  });

  it("is due, never late, for a month that has not started", () => {
    const future = monthly({ description: "Internet", category: "Internet", amount: 81 }, 6, 3, 5);
    const s = detectRecurring(future, 2026, 9, NOW)[0];
    expect(s.status).toBe("due");
  });

  it("is missed for a month that is entirely over", () => {
    const older = monthly({ description: "Internet", category: "Internet", amount: 81 }, 3, 3, 5);
    const s = detectRecurring(older, 2026, 6, NOW)[0];
    expect(s.status).toBe("missed");
  });
});

describe("detectRecurring ordering", () => {
  it("puts what is still owed above what is settled, largest first", () => {
    const rows = [
      // Paid this month.
      ...monthly({ description: "Internet", category: "Internet", amount: 81 }, 5, 5, 5),
      // Late: expected on the 2nd, nothing in September.
      ...monthly({ description: "Arriendo", category: "Arriendo", amount: 2950 }, 5, 4, 2),
      // Due: expected on the 25th, still ahead of the 15th.
      ...monthly({ description: "Seguro", category: "Seguro", amount: 384 }, 5, 4, 25),
    ];
    const order = detectRecurring(rows, 2026, 8, NOW).map((s) => s.label);
    expect(order).toEqual(["Arriendo", "Seguro", "Internet"]);
  });

  it("breaks a tie on amount by label", () => {
    const rows = [
      ...monthly({ description: "Beta", category: "Agua", amount: 50 }, 5, 4, 2),
      ...monthly({ description: "Alfa", category: "Gas", amount: 50 }, 5, 4, 2),
    ];
    expect(detectRecurring(rows, 2026, 8, NOW).map((s) => s.label)).toEqual(["Alfa", "Beta"]);
  });
});

describe("summarizeRecurring", () => {
  const rows = [
    ...monthly({ description: "Internet", category: "Internet", amount: 100 }, 5, 4, 5),
    entry({ description: "Internet", category: "Internet", amount: 100, expense_at: "2026-09-05T09:00:00" }),
    ...monthly({ description: "Arriendo", category: "Arriendo", amount: 300 }, 5, 4, 2),
  ];

  it("adds up the commitment, what is settled and what is left", () => {
    const s = summarizeRecurring(detectRecurring(rows, 2026, 8, NOW));
    expect(s.count).toBe(2);
    expect(s.committed).toBe(400);
    expect(s.paid).toBe(100);
    expect(s.outstanding).toBe(300);
    expect(s.coverage).toBeCloseTo(0.25);
    expect(s.late).toBe(1);
    expect(s.due).toBe(0);
  });

  it("is all zeroes for no series", () => {
    expect(summarizeRecurring([])).toEqual({
      count: 0,
      committed: 0,
      paid: 0,
      outstanding: 0,
      coverage: 0,
      late: 0,
      due: 0,
    });
  });

  it("never reports more than full coverage when the month overpaid", () => {
    const over = [
      ...monthly({ description: "Internet", category: "Internet", amount: 100 }, 5, 4, 5),
      entry({ description: "Internet", category: "Internet", amount: 400, expense_at: "2026-09-05T09:00:00" }),
    ];
    expect(summarizeRecurring(detectRecurring(over, 2026, 8, NOW)).coverage).toBe(1);
  });
});
