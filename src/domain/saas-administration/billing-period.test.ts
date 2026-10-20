import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { assertBillingDuration, assertBillingPeriod, billingDateInChile, billingPeriodAt, daysBetween } from "./billing-period";

describe("SaaS calendar billing periods", () => {
  it("retains the original monthly anchor across February", () => {
    const monthly = { unit: "months", count: 1 } as const;
    expect(billingPeriodAt("2026-01-31", monthly)).toEqual({ startsOn: "2026-01-31", endsBefore: "2026-02-28" });
    expect(billingPeriodAt("2026-01-31", monthly, 1)).toEqual({ startsOn: "2026-02-28", endsBefore: "2026-03-31" });
    expect(billingPeriodAt("2026-01-31", monthly, 2)).toEqual({ startsOn: "2026-03-31", endsBefore: "2026-04-30" });
  });

  it("handles leap years, quarterly and annual periods", () => {
    expect(billingPeriodAt("2024-01-31", { unit: "months", count: 1 }).endsBefore).toBe("2024-02-29");
    expect(billingPeriodAt("2024-02-29", { unit: "months", count: 12 }, 3)).toEqual({ startsOn: "2027-02-28", endsBefore: "2028-02-29" });
    expect(billingPeriodAt("2026-11-30", { unit: "months", count: 3 }).endsBefore).toBe("2027-02-28");
  });

  it("handles configurable days without timezone or DST elapsed-hour effects", () => {
    expect(billingPeriodAt("2026-09-01", { unit: "days", count: 30 })).toEqual({ startsOn: "2026-09-01", endsBefore: "2026-10-01" });
    expect(daysBetween("2026-09-05", "2026-09-07")).toBe(2);
    expect(daysBetween("2026-04-04", "2026-04-06")).toBe(2);
    expect(billingPeriodAt("2024-02-28", { unit: "days", count: 2 }, 1)).toEqual({ startsOn: "2024-03-01", endsBefore: "2024-03-03" });
  });

  it("interprets instants in Chile rather than UTC and respects DST", () => {
    expect(billingDateInChile(new Date("2026-07-01T03:30:00Z"))).toBe("2026-06-30");
    expect(billingDateInChile(new Date("2026-12-01T03:30:00Z"))).toBe("2026-12-01");
    expect(() => billingDateInChile(new Date("invalid"))).toThrow(ValidationError);
  });

  it("does not remap ISO years below 100 to the twentieth century", () => {
    expect(billingPeriodAt("0099-12-31", { unit: "days", count: 1 })).toEqual({ startsOn: "0099-12-31", endsBefore: "0100-01-01" });
  });

  it.each(["2026-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "0000-01-01", "26-01-01", "2026-1-01", "2026-01-01T00:00:00Z"])("rejects invalid date %s", anchor => {
    expect(() => billingPeriodAt(anchor, { unit: "days", count: 1 })).toThrow(ValidationError);
  });

  it.each([0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects duration %s", count => {
    expect(() => billingPeriodAt("2026-01-01", { unit: "months", count })).toThrow(ValidationError);
  });

  it("rejects unknown units, reversed periods, invalid indices and out-of-range dates", () => {
    expect(() => assertBillingDuration({ unit: "weeks" as "days", count: 1 })).toThrow(ValidationError);
    expect(() => assertBillingPeriod({ startsOn: "2026-01-02", endsBefore: "2026-01-01" })).toThrow(ValidationError);
    expect(() => assertBillingPeriod({ startsOn: "2026-01-01", endsBefore: "2026-01-01" })).toThrow(ValidationError);
    expect(() => billingPeriodAt("2026-01-01", { unit: "months", count: 1 }, -1)).toThrow(ValidationError);
    expect(() => billingPeriodAt("2026-01-01", { unit: "months", count: 1 }, 0.5)).toThrow(ValidationError);
    expect(() => billingPeriodAt("9999-12-31", { unit: "days", count: 1 })).toThrow(ValidationError);
    expect(() => billingPeriodAt("9999-12-01", { unit: "months", count: 1 })).toThrow(ValidationError);
    expect(() => billingPeriodAt("2026-01-01", { unit: "days", count: Number.MAX_SAFE_INTEGER }, 2)).toThrow(ValidationError);
  });
});
