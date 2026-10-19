import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { assertClpAmount, billingRate, includedVat, maxClpAmount, roundClpRate } from "./billing-money";

describe("CLP billing money", () => {
  it("separates included VAT without increasing the final price", () => {
    expect(includedVat(11_900)).toEqual({ total: 11_900, net: 10_000, vat: 1_900, vatRate: 19 });
    expect(includedVat(0)).toEqual({ total: 0, net: 0, vat: 0, vatRate: 19 });
  });

  it("rounds half up only once and keeps net plus VAT equal to total", () => {
    expect(roundClpRate(billingRate(BigInt(1), BigInt(2)))).toBe(1);
    expect(roundClpRate(billingRate(BigInt(149), BigInt(100)))).toBe(1);
    expect(roundClpRate(billingRate(BigInt(150), BigInt(100)))).toBe(2);
    for (let total = 0; total <= 20_000; total += 1) {
      const result = includedVat(total);
      expect(result.net + result.vat).toBe(total);
      expect(Number.isInteger(result.net)).toBe(true);
      expect(result.vat).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses exact intermediate products beyond Number safe integer range", () => {
    const large = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(Number.MAX_SAFE_INTEGER);
    expect(roundClpRate(billingRate(large, large * BigInt(2)))).toBe(1);
    const result = includedVat(maxClpAmount);
    expect(result.net + result.vat).toBe(maxClpAmount);
  });

  it("normalizes rational rates, including zero", () => {
    expect(billingRate(BigInt(60_000), BigInt(30))).toEqual({ numerator: BigInt(2_000), denominator: BigInt(1) });
    expect(billingRate(BigInt(0), BigInt(30))).toEqual({ numerator: BigInt(0), denominator: BigInt(1) });
  });

  it.each([-1, 0.5, NaN, Infinity, maxClpAmount + 1, Number.MAX_SAFE_INTEGER + 1])("rejects invalid CLP amount %s", amount => {
    expect(() => assertClpAmount(amount)).toThrow(ValidationError);
    expect(() => includedVat(amount)).toThrow(ValidationError);
  });

  it("rejects negative rates, zero divisors and overflowing results", () => {
    expect(() => billingRate(BigInt(-1), BigInt(2))).toThrow(ValidationError);
    expect(() => billingRate(BigInt(1), BigInt(0))).toThrow(ValidationError);
    expect(() => roundClpRate({ numerator: BigInt(1), denominator: BigInt(-1) })).toThrow(ValidationError);
    expect(() => roundClpRate(billingRate(BigInt(maxClpAmount) + BigInt(1), BigInt(1)))).toThrow(ValidationError);
  });
});
