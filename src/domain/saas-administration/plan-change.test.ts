import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { billingRate, maxClpAmount } from "./billing-money";
import { billingPeriodAt } from "./billing-period";
import { monthlyRecurringRate, periodDailyRate, quotePlanChange } from "./plan-change";

const currentPeriod = { startsOn: "2026-01-01", endsBefore: "2026-01-31" };
const input = {
  currentDailyRate: periodDailyRate(30_000, currentPeriod),
  currentPeriod,
  onDate: "2026-01-21",
  newPrice: 60_000,
  newDuration: { unit: "days", count: 30 } as const,
};

describe("SaaS plan change quotes", () => {
  it("charges exactly 10,000 for a 30,000 to 60,000 upgrade with 10/30 days left", () => {
    expect(quotePlanChange(input)).toMatchObject({
      kind: "upgrade", amountDue: 10_000, remainingDays: 10,
      effectiveOn: "2026-01-21", currentPeriod,
    });
  });

  it("uses the last applied rate for successive same-day upgrades", () => {
    const first = quotePlanChange(input);
    const second = quotePlanChange({ ...input, currentDailyRate: first.newDailyRate, newPrice: 90_000 });
    expect(first.amountDue).toBe(10_000);
    expect(second.amountDue).toBe(10_000);
    expect(first.amountDue + second.amountDue).toBe(quotePlanChange({ ...input, newPrice: 90_000 }).amountDue);
  });

  it("classifies different durations by daily rate rather than sticker price", () => {
    const downgrade = quotePlanChange({ ...input, newPrice: 40_000, newDuration: { unit: "days", count: 60 } });
    expect(downgrade).toMatchObject({ kind: "downgrade", amountDue: 0, effectiveOn: currentPeriod.endsBefore });
    const equivalent = quotePlanChange({ ...input, newPrice: 60_000, newDuration: { unit: "days", count: 60 } });
    expect(equivalent).toMatchObject({ kind: "equivalent", amountDue: 0, effectiveOn: currentPeriod.endsBefore });
  });

  it("does not round the daily rate before calculating the remaining period", () => {
    const quote = quotePlanChange({
      ...input, currentDailyRate: billingRate(BigInt(0), BigInt(1)),
      currentPeriod: { startsOn: "2026-01-01", endsBefore: "2026-01-04" },
      onDate: "2026-01-01", newPrice: 100, newDuration: { unit: "days", count: 3 },
    });
    expect(quote.amountDue).toBe(100);
  });

  it("allows a sub-peso difference to round to zero without changing classification", () => {
    const quote = quotePlanChange({
      ...input, currentDailyRate: billingRate(BigInt(1), BigInt(100)), onDate: "2026-01-30",
      newPrice: 1, newDuration: { unit: "days", count: 30 },
    });
    expect(quote.kind).toBe("upgrade");
    expect(quote.amountDue).toBe(0);
  });

  it("uses actual new calendar-month length and retains the current boundary", () => {
    const quote = quotePlanChange({
      ...input, currentPeriod: billingPeriodAt("2024-01-31", { unit: "months", count: 1 }),
      currentDailyRate: billingRate(BigInt(1_000), BigInt(1)), onDate: "2024-02-20",
      newPrice: 58_000, newDuration: { unit: "months", count: 1 },
    });
    expect(quote.remainingDays).toBe(9);
    expect(quote.newDailyRate).toEqual(billingRate(BigInt(58_000), BigInt(29)));
    expect(quote.amountDue).toBe(9_000);
    expect(quote.currentPeriod.endsBefore).toBe("2024-02-29");
  });

  it("allows changes on the first day but not on the exclusive end date", () => {
    expect(quotePlanChange({ ...input, onDate: currentPeriod.startsOn }).amountDue).toBe(30_000);
    expect(quotePlanChange({ ...input, onDate: "2026-01-30" }).amountDue).toBe(1_000);
    for (const onDate of ["2025-12-31", currentPeriod.endsBefore, "2026-02-01"]) {
      expect(() => quotePlanChange({ ...input, onDate })).toThrow(ValidationError);
    }
  });

  it("rejects invalid money, rates and prorations that exceed the database maximum", () => {
    expect(() => quotePlanChange({ ...input, newPrice: 1.5 })).toThrow(ValidationError);
    expect(() => quotePlanChange({ ...input, currentDailyRate: { numerator: BigInt(1), denominator: BigInt(0) } })).toThrow(ValidationError);
    expect(() => quotePlanChange({ ...input, newPrice: maxClpAmount, newDuration: { unit: "days", count: 1 } })).toThrow(ValidationError);
  });

  it("normalizes MRR exactly for days or months, without rounding the underlying rate", () => {
    expect(monthlyRecurringRate(120_000, { unit: "months", count: 12 })).toEqual(billingRate(BigInt(10_000), BigInt(1)));
    expect(monthlyRecurringRate(30_000, { unit: "days", count: 30 })).toEqual(billingRate(BigInt(30_000) * BigInt(365), BigInt(360)));
    expect(monthlyRecurringRate(1, { unit: "months", count: 3 })).toEqual(billingRate(BigInt(1), BigInt(3)));
    expect(monthlyRecurringRate(0, { unit: "days", count: 30 })).toEqual(billingRate(BigInt(0), BigInt(1)));
  });
});
