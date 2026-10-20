import { describe, expect, it } from "vitest";
import { isValidIssuerTaxId, normalizeIssuerTaxId } from "./billing-issuer";

describe("issuer RUT", () => {
  it.each(["12345678-5", "11111111-1", "10000000-8", "10000013-K"])("accepts checksum-valid %s", (value) => {
    expect(isValidIssuerTaxId(value)).toBe(true);
  });
  it.each(["", "0-0", "00000000-0", "12345678-9", "12.345.678-5", "12345678", "10000013-k", "123-4"])("rejects %s", (value) => {
    expect(isValidIssuerTaxId(value)).toBe(false);
  });
  it("normalizes dots, outer whitespace and K without silently repairing an invalid RUT", () => {
    expect(normalizeIssuerTaxId(" 10.000.013-k ")).toBe("10000013-K");
    expect(isValidIssuerTaxId(normalizeIssuerTaxId("12.345.678-9"))).toBe(false);
  });
});
