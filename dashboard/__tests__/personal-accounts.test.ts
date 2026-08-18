// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getAccounts, saveAccounts } from "@/lib/personal-accounts";
import { PERSONAL_ACCOUNTS } from "@/lib/data";

const KEY = "n2s_personal_accounts";

describe("getAccounts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the hardcoded defaults when nothing is stored", () => {
    expect(getAccounts()).toEqual(PERSONAL_ACCOUNTS);
  });

  it("returns a copy of the defaults, so callers cannot mutate them", () => {
    const accounts = getAccounts();
    accounts.checking = 999;
    expect(PERSONAL_ACCOUNTS.checking).toBe(0);
  });

  it("returns the stored balances", () => {
    localStorage.setItem(KEY, JSON.stringify({ checking: 1200.5, savings: 800, credit: 250 }));
    expect(getAccounts()).toEqual({ checking: 1200.5, savings: 800, credit: 250 });
  });

  it("falls back to the defaults when the stored value is malformed JSON", () => {
    localStorage.setItem(KEY, "{nope");
    expect(getAccounts()).toEqual(PERSONAL_ACCOUNTS);
  });

  it("falls back to the defaults when checking is missing or not a number", () => {
    localStorage.setItem(KEY, JSON.stringify({ savings: 800, credit: 250 }));
    expect(getAccounts()).toEqual(PERSONAL_ACCOUNTS);

    localStorage.setItem(KEY, JSON.stringify({ checking: "1200", savings: 800, credit: 250 }));
    expect(getAccounts()).toEqual(PERSONAL_ACCOUNTS);
  });

  it("only validates `checking`, so the other balances can come back missing", () => {
    // Quirk: a stored object with a numeric `checking` is trusted wholesale.
    localStorage.setItem(KEY, JSON.stringify({ checking: 10 }));
    expect(getAccounts()).toEqual({ checking: 10 });
  });
});

describe("saveAccounts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips through getAccounts", () => {
    saveAccounts({ checking: 1, savings: 2, credit: 3 });
    expect(getAccounts()).toEqual({ checking: 1, savings: 2, credit: 3 });
  });

  it("writes under the personal accounts key", () => {
    saveAccounts({ checking: 1, savings: 2, credit: 3 });
    expect(localStorage.getItem(KEY)).toBe('{"checking":1,"savings":2,"credit":3}');
  });
});
