import { describe, expect, it } from "vitest";
import {
  clampDayOfMonth,
  isDueInDays,
  monthBoundsToronto,
  nextDueDate,
} from "@/lib/briefing/dates";

// Pure date logic for the briefing. `month` is zero-based (0 = January).
//
// Reference instants are written as UTC ISO strings with the Toronto wall time
// they correspond to in a comment, so the tests never depend on the machine's
// local zone and never reuse the module's own zone conversion. Toronto is
// UTC-5 (EST) in winter and UTC-4 (EDT) in summer; in 2026 the clocks spring
// forward on March 8 and fall back on November 1.

const HOUR = 3_600_000;

describe("clampDayOfMonth", () => {
  it("passes through a day that exists in a 31-day month", () => {
    expect(clampDayOfMonth(2026, 0, 31)).toBe(31); // January
    expect(clampDayOfMonth(2026, 11, 31)).toBe(31); // December
  });

  it("clamps the 31st to the 30th in a 30-day month", () => {
    expect(clampDayOfMonth(2026, 3, 31)).toBe(30); // April
    expect(clampDayOfMonth(2026, 5, 31)).toBe(30); // June
    expect(clampDayOfMonth(2026, 8, 31)).toBe(30); // September
    expect(clampDayOfMonth(2026, 10, 31)).toBe(30); // November
  });

  it("clamps to 28 in February of a non-leap year", () => {
    expect(clampDayOfMonth(2027, 1, 31)).toBe(28);
    expect(clampDayOfMonth(2027, 1, 30)).toBe(28);
    expect(clampDayOfMonth(2027, 1, 29)).toBe(28);
    expect(clampDayOfMonth(2027, 1, 28)).toBe(28);
  });

  it("clamps to 29 in February of a leap year", () => {
    expect(clampDayOfMonth(2028, 1, 31)).toBe(29);
    expect(clampDayOfMonth(2028, 1, 30)).toBe(29);
    expect(clampDayOfMonth(2028, 1, 29)).toBe(29);
    expect(clampDayOfMonth(2028, 1, 28)).toBe(28);
  });

  it("follows the century rule for leap years", () => {
    expect(clampDayOfMonth(2100, 1, 31)).toBe(28); // divisible by 100, not 400
    expect(clampDayOfMonth(2000, 1, 31)).toBe(29); // divisible by 400
  });

  it("leaves the household's real bill days untouched", () => {
    for (let month = 0; month < 12; month++) {
      expect(clampDayOfMonth(2026, month, 15)).toBe(15);
      expect(clampDayOfMonth(2026, month, 20)).toBe(20);
    }
  });

  it("clamps a day below the first up to the first", () => {
    expect(clampDayOfMonth(2026, 0, 0)).toBe(1);
    expect(clampDayOfMonth(2026, 0, -3)).toBe(1);
  });
});

describe("nextDueDate", () => {
  it("stays in this month when the day is still ahead", () => {
    const from = new Date("2026-08-13T16:00:00Z"); // Aug 13, 12:00 Toronto
    expect(nextDueDate(15, from).toISOString()).toBe("2026-08-15T04:00:00.000Z");
  });

  it("returns today when today is the due day", () => {
    const from = new Date("2026-08-15T16:00:00Z"); // Aug 15, 12:00 Toronto
    expect(nextDueDate(15, from).toISOString()).toBe("2026-08-15T04:00:00.000Z");
  });

  it("still returns today late in the evening of the due day", () => {
    const from = new Date("2026-08-16T03:30:00Z"); // Aug 15, 23:30 Toronto
    expect(nextDueDate(15, from).toISOString()).toBe("2026-08-15T04:00:00.000Z");
  });

  it("rolls into the following month once the day has passed", () => {
    const from = new Date("2026-08-16T16:00:00Z"); // Aug 16, 12:00 Toronto
    expect(nextDueDate(15, from).toISOString()).toBe("2026-09-15T04:00:00.000Z");
  });

  it("rolls across the year boundary", () => {
    const from = new Date("2026-12-21T17:00:00Z"); // Dec 21, 12:00 Toronto
    expect(nextDueDate(20, from).toISOString()).toBe("2027-01-20T05:00:00.000Z");
  });

  it("clamps rent on the 31st into a month that has no 31st", () => {
    const april = new Date("2026-04-01T16:00:00Z"); // Apr 1, 12:00 Toronto
    expect(nextDueDate(31, april).toISOString()).toBe("2026-04-30T04:00:00.000Z");

    const feb2027 = new Date("2027-02-01T17:00:00Z"); // Feb 1, 12:00 Toronto — non-leap
    expect(nextDueDate(31, feb2027).toISOString()).toBe("2027-02-28T05:00:00.000Z");

    const feb2028 = new Date("2028-02-01T17:00:00Z"); // Feb 1, 12:00 Toronto — leap
    expect(nextDueDate(31, feb2028).toISOString()).toBe("2028-02-29T05:00:00.000Z");
  });

  it("clamps again after rolling into a shorter month", () => {
    // Jan 31 has passed as of Feb 1, so the next rent date is February's last day.
    const from = new Date("2027-01-31T17:00:00Z"); // Jan 31, 12:00 Toronto
    expect(nextDueDate(31, from).toISOString()).toBe("2027-01-31T05:00:00.000Z");
    const nextMonth = new Date("2027-02-02T17:00:00Z"); // Feb 2, 12:00 Toronto
    expect(nextDueDate(31, nextMonth).toISOString()).toBe("2027-02-28T05:00:00.000Z");
  });

  it("uses the Toronto calendar day, not the Worker's UTC day", () => {
    // 2026-08-15T03:00:00Z is already the 15th in UTC but still the 14th in
    // Toronto, so a bill due on the 14th is due today — not next month.
    const from = new Date("2026-08-15T03:00:00Z"); // Aug 14, 23:00 Toronto
    expect(nextDueDate(14, from).toISOString()).toBe("2026-08-14T04:00:00.000Z");
  });

  it("returns Toronto midnight on the day the clocks spring forward", () => {
    const from = new Date("2026-03-02T17:00:00Z"); // Mar 2, 12:00 Toronto (EST)
    // Midnight on Mar 8 is still EST; the shift happens at 02:00 that morning.
    expect(nextDueDate(8, from).toISOString()).toBe("2026-03-08T05:00:00.000Z");
  });

  it("returns Toronto midnight on the day the clocks fall back", () => {
    const from = new Date("2026-10-30T16:00:00Z"); // Oct 30, 12:00 Toronto (EDT)
    // Midnight on Nov 1 is still EDT; the shift happens at 02:00 that morning.
    expect(nextDueDate(1, from).toISOString()).toBe("2026-11-01T04:00:00.000Z");
  });
});

describe("isDueInDays", () => {
  it("is true exactly two days before, and false on either side", () => {
    const from = new Date("2026-08-13T16:00:00Z"); // Aug 13, 12:00 Toronto
    expect(isDueInDays(15, from, 2)).toBe(true);
    expect(isDueInDays(15, from, 1)).toBe(false);
    expect(isDueInDays(15, from, 3)).toBe(false);
  });

  it("counts calendar days regardless of the hour on either end", () => {
    const justAfterMidnight = new Date("2026-08-13T04:05:00Z"); // Aug 13, 00:05 Toronto
    const lateEvening = new Date("2026-08-14T03:30:00Z"); // Aug 13, 23:30 Toronto
    expect(isDueInDays(15, justAfterMidnight, 2)).toBe(true);
    expect(isDueInDays(15, lateEvening, 2)).toBe(true);
  });

  it("is true with zero days on the due day itself", () => {
    const from = new Date("2026-08-15T16:00:00Z"); // Aug 15, 12:00 Toronto
    expect(isDueInDays(15, from, 0)).toBe(true);
    expect(isDueInDays(15, from, 2)).toBe(false);
  });

  it("works across a month boundary", () => {
    const from = new Date("2026-08-31T16:00:00Z"); // Aug 31, 12:00 Toronto
    expect(isDueInDays(2, from, 2)).toBe(true); // due Sep 2
  });

  it("works across a year boundary", () => {
    const from = new Date("2026-12-31T17:00:00Z"); // Dec 31, 12:00 Toronto
    expect(isDueInDays(2, from, 2)).toBe(true); // due Jan 2, 2027
    expect(isDueInDays(2, from, 1)).toBe(false);
  });

  it("fires for rent on the 31st in a month that has no 31st", () => {
    const april = new Date("2026-04-28T16:00:00Z"); // Apr 28, 12:00 Toronto
    expect(isDueInDays(31, april, 2)).toBe(true); // clamped to Apr 30

    const feb2027 = new Date("2027-02-26T17:00:00Z"); // Feb 26, 12:00 Toronto — non-leap
    expect(isDueInDays(31, feb2027, 2)).toBe(true); // clamped to Feb 28
    expect(isDueInDays(31, feb2027, 3)).toBe(false);

    const feb2028 = new Date("2028-02-27T17:00:00Z"); // Feb 27, 12:00 Toronto — leap
    expect(isDueInDays(31, feb2028, 2)).toBe(true); // clamped to Feb 29
    expect(isDueInDays(31, feb2028, 3)).toBe(false);
  });

  it("counts two days across the spring-forward transition", () => {
    const from = new Date("2026-03-07T17:00:00Z"); // Mar 7, 12:00 Toronto (EST)
    const due = nextDueDate(9, from);
    // Noon Saturday to midnight Monday is 36 hours of clock time, but only 35
    // hours actually elapse because March 8 loses one. An elapsed-milliseconds
    // comparison floors that to 1 day and skips the reminder.
    expect((due.getTime() - from.getTime()) / HOUR).toBe(35);
    expect(isDueInDays(9, from, 2)).toBe(true);
    expect(isDueInDays(9, from, 1)).toBe(false);
  });

  it("counts two days across the fall-back transition and a month boundary", () => {
    const from = new Date("2026-10-31T16:00:00Z"); // Oct 31, 12:00 Toronto (EDT)
    const due = nextDueDate(2, from);
    // The mirror image: Nov 1 is 25 hours long, so 37 hours elapse across the
    // same 36 hours of clock time.
    expect((due.getTime() - from.getTime()) / HOUR).toBe(37);
    expect(isDueInDays(2, from, 2)).toBe(true);
    expect(isDueInDays(2, from, 3)).toBe(false);
  });

  it("counts the fall-back day itself as one day", () => {
    const from = new Date("2026-11-01T16:00:00Z"); // Nov 1, 12:00 Toronto (EST, post-shift)
    expect(isDueInDays(2, from, 1)).toBe(true);
  });
});

describe("monthBoundsToronto", () => {
  it("uses the -05:00 EST offset for a month starting in winter", () => {
    expect(monthBoundsToronto(2026, 0)).toEqual({
      startISO: "2026-01-01T05:00:00.000Z",
      endISO: "2026-02-01T05:00:00.000Z",
    });
  });

  it("uses the -04:00 EDT offset for a month starting in summer", () => {
    expect(monthBoundsToronto(2026, 6)).toEqual({
      startISO: "2026-07-01T04:00:00.000Z",
      endISO: "2026-08-01T04:00:00.000Z",
    });
  });

  it("differs by exactly one hour between an EST month and an EDT month", () => {
    const january = new Date(monthBoundsToronto(2026, 0).startISO);
    const july = new Date(monthBoundsToronto(2026, 6).startISO);
    expect(january.getUTCHours()).toBe(5); // UTC-05:00
    expect(july.getUTCHours()).toBe(4); // UTC-04:00
    expect(january.getUTCHours() - july.getUTCHours()).toBe(1);
  });

  it("straddles the spring-forward transition within March", () => {
    // March starts in EST and ends in EDT, so the bounds carry different offsets.
    expect(monthBoundsToronto(2026, 2)).toEqual({
      startISO: "2026-03-01T05:00:00.000Z",
      endISO: "2026-04-01T04:00:00.000Z",
    });
  });

  it("handles a month boundary that lands on the fall-back day", () => {
    // November 1, 2026 is both the first of the month and the day the clocks
    // fall back; midnight that morning is still EDT.
    expect(monthBoundsToronto(2026, 10)).toEqual({
      startISO: "2026-11-01T04:00:00.000Z",
      endISO: "2026-12-01T05:00:00.000Z",
    });
    // October's end must be November's start, with no gap or overlap.
    expect(monthBoundsToronto(2026, 9).endISO).toBe(monthBoundsToronto(2026, 10).startISO);
  });

  it("rolls December's end into the next year", () => {
    expect(monthBoundsToronto(2026, 11)).toEqual({
      startISO: "2026-12-01T05:00:00.000Z",
      endISO: "2027-01-01T05:00:00.000Z",
    });
  });

  it("covers February exactly in a non-leap and a leap year", () => {
    expect(monthBoundsToronto(2027, 1)).toEqual({
      startISO: "2027-02-01T05:00:00.000Z",
      endISO: "2027-03-01T05:00:00.000Z",
    });
    expect(monthBoundsToronto(2028, 1)).toEqual({
      startISO: "2028-02-01T05:00:00.000Z",
      endISO: "2028-03-01T05:00:00.000Z",
    });
    const days = (b: { startISO: string; endISO: string }) =>
      (Date.parse(b.endISO) - Date.parse(b.startISO)) / 86_400_000;
    expect(days(monthBoundsToronto(2027, 1))).toBe(28);
    expect(days(monthBoundsToronto(2028, 1))).toBe(29);
  });

  it("is half-open and contiguous across a whole year", () => {
    for (let month = 0; month < 11; month++) {
      expect(monthBoundsToronto(2026, month).endISO).toBe(
        monthBoundsToronto(2026, month + 1).startISO,
      );
    }
  });
});
