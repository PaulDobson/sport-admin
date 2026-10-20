import { ValidationError } from "@/domain/shared/errors";
import {
  assertClpAmount,
  billingRate,
  roundClpRate,
  type BillingRate,
} from "./billing-money";
import {
  assertBillingDuration,
  assertBillingPeriod,
  billingPeriodAt,
  daysBetween,
  type BillingDuration,
  type BillingPeriod,
} from "./billing-period";

export function periodDailyRate(price: number, period: BillingPeriod): BillingRate {
  assertClpAmount(price);
  assertBillingPeriod(period);
  return billingRate(BigInt(price), BigInt(daysBetween(period.startsOn, period.endsBefore)));
}

export function monthlyRecurringRate(price: number, duration: BillingDuration): BillingRate {
  assertClpAmount(price);
  assertBillingDuration(duration);
  return duration.unit === "months"
    ? billingRate(BigInt(price), BigInt(duration.count))
    : billingRate(BigInt(price) * BigInt(365), BigInt(12) * BigInt(duration.count));
}

export interface PlanChangeQuote {
  kind: "upgrade" | "downgrade" | "equivalent";
  effectiveOn: string;
  remainingDays: number;
  amountDue: number;
  currentDailyRate: BillingRate;
  newDailyRate: BillingRate;
  currentPeriod: BillingPeriod;
}

export function quotePlanChange(input: {
  currentDailyRate: BillingRate;
  currentPeriod: BillingPeriod;
  onDate: string;
  newPrice: number;
  newDuration: BillingDuration;
}): PlanChangeQuote {
  assertBillingPeriod(input.currentPeriod);
  const elapsed = daysBetween(input.currentPeriod.startsOn, input.onDate);
  const remainingDays = daysBetween(input.onDate, input.currentPeriod.endsBefore);
  if (elapsed < 0 || remainingDays <= 0) {
    throw new ValidationError([{
      path: "onDate",
      message: "El cambio debe calcularse dentro del período vigente.",
    }]);
  }
  const current = billingRate(input.currentDailyRate.numerator, input.currentDailyRate.denominator);
  const next = periodDailyRate(input.newPrice, billingPeriodAt(input.onDate, input.newDuration));
  const difference = next.numerator * current.denominator - current.numerator * next.denominator;
  const kind = difference > BigInt(0) ? "upgrade" : difference < BigInt(0) ? "downgrade" : "equivalent";
  const amountDue = kind === "upgrade"
    ? roundClpRate(billingRate(difference * BigInt(remainingDays), next.denominator * current.denominator))
    : 0;
  return {
    kind,
    effectiveOn: kind === "upgrade" ? input.onDate : input.currentPeriod.endsBefore,
    remainingDays,
    amountDue,
    currentDailyRate: current,
    newDailyRate: next,
    currentPeriod: { ...input.currentPeriod },
  };
}
