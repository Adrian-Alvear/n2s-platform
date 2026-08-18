// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PAYMENTS,
  PAYMENTS_KEY,
  getPayments,
  paymentsTotal,
  savePayments,
  type Payment,
} from "@/lib/personal-payments-store";

// Adrian's recurring monthly payments checklist, persisted on the device.

const payments: Payment[] = [
  { id: "car", name: "Car", amount: 320.5, paid: true },
  { id: "insurance", name: "Insurance", amount: 120, paid: false },
];

describe("getPayments", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the defaults when nothing is stored", () => {
    expect(getPayments()).toEqual(DEFAULT_PAYMENTS);
  });

  it("returns the stored list", () => {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
    expect(getPayments()).toEqual(payments);
  });

  it("returns an empty stored list rather than the defaults", () => {
    localStorage.setItem(PAYMENTS_KEY, "[]");
    expect(getPayments()).toEqual([]);
  });

  it("falls back to the defaults when the stored value is malformed JSON", () => {
    localStorage.setItem(PAYMENTS_KEY, "[{oops");
    expect(getPayments()).toEqual(DEFAULT_PAYMENTS);
  });

  it("falls back to the defaults when the stored value is not an array", () => {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify({ car: 100 }));
    expect(getPayments()).toEqual(DEFAULT_PAYMENTS);
  });

  it("falls back to the defaults when the stored value is null", () => {
    localStorage.setItem(PAYMENTS_KEY, "null");
    expect(getPayments()).toEqual(DEFAULT_PAYMENTS);
  });

  it("does not validate the shape of stored entries", () => {
    // Quirk: the only check is Array.isArray, so junk round-trips unchanged.
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([1, 2, 3]));
    expect(getPayments()).toEqual([1, 2, 3]);
  });

  it("hands back the shared DEFAULT_PAYMENTS array itself, not a copy", () => {
    // Quirk: callers that mutate the returned array edit the module-level
    // defaults for every later caller in the same page session.
    expect(getPayments()).toBe(DEFAULT_PAYMENTS);
  });
});

describe("savePayments", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes the list under the shared key", () => {
    savePayments(payments);
    expect(localStorage.getItem(PAYMENTS_KEY)).toBe(JSON.stringify(payments));
  });

  it("round-trips through getPayments", () => {
    savePayments(payments);
    expect(getPayments()).toEqual(payments);
  });

  it("overwrites a previously saved list", () => {
    savePayments(payments);
    savePayments([{ id: "car", name: "Car", amount: 1, paid: false }]);
    expect(getPayments()).toHaveLength(1);
  });
});

describe("paymentsTotal", () => {
  it("sums the amounts regardless of paid state", () => {
    expect(paymentsTotal(payments)).toBe(440.5);
  });

  it("returns 0 for an empty list", () => {
    expect(paymentsTotal([])).toBe(0);
  });

  it("returns 0 for the defaults, which have no amounts yet", () => {
    expect(paymentsTotal(DEFAULT_PAYMENTS)).toBe(0);
  });
});
