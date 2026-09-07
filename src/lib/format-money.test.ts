import { describe, expect, it } from "vitest";
import { formatMoney } from "./format-money";

describe("formatMoney", () => {
  it("formats CLP without decimal places using Chilean Spanish", () => {
    expect(formatMoney(1234567.89, "CLP")).toBe("$1.234.568");
  });

  it("preserves currency-specific precision for USD", () => {
    expect(formatMoney(1234.5, "USD")).toBe("US$1.234,50");
  });

  it("preserves currency-specific precision for EUR", () => {
    expect(formatMoney(1234.5, "EUR")).toBe("EUR 1.234,50");
  });
});
