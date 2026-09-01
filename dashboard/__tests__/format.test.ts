import { describe, expect, it } from "vitest";
import { money, percent } from "@/lib/format";

describe("money", () => {
  it("renders whole dollars with no decimals by default", () => {
    expect(money(1234)).toBe("$1,234");
  });

  it("groups thousands", () => {
    expect(money(2950)).toBe("$2,950");
  });

  it("rounds to the requested precision", () => {
    expect(money(12.345, 2)).toBe("$12.35");
  });

  it("pads to the requested precision", () => {
    expect(money(12, 2)).toBe("$12.00");
  });

  it("shows magnitude only — the sign belongs in the copy beside it", () => {
    expect(money(-120)).toBe("$120");
  });

  it("falls back to zero for a non-finite amount", () => {
    expect(money(NaN)).toBe("$0");
    expect(money(Infinity)).toBe("$0");
  });
});

describe("percent", () => {
  it("renders a fraction as whole percent", () => {
    expect(percent(0.25)).toBe("25%");
  });

  it("rounds to the nearest whole percent", () => {
    expect(percent(0.336)).toBe("34%");
  });

  it("handles the ends of the range", () => {
    expect(percent(0)).toBe("0%");
    expect(percent(1)).toBe("100%");
  });

  it("falls back to zero for a non-finite fraction", () => {
    expect(percent(NaN)).toBe("0%");
  });
});
