import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { assertClpAmount, includedVat } from "./billing-money";
import { assertBillingDuration, assertBillingPeriod, billingPeriodAt, daysBetween, type BillingDuration, type BillingPeriod } from "./billing-period";

export interface RenewalTerms {
  versionId: string;
  price: number;
  duration: BillingDuration;
  maxStudents: number;
  maxUsers: number;
}
export interface RenewalInput {
  today: string;
  currentPeriod: BillingPeriod;
  anchorOn: string;
  periodIndex: number;
  status: "trial" | "active" | "past_due" | "suspended";
  terms: RenewalTerms;
  firstInvoiceDueOn: string | null;
  activeStudents: number;
  activeUsers: number;
  scheduledChange: { id: string; effectiveOn: string; terms: RenewalTerms } | null;
}
export interface RenewalQuote {
  period: BillingPeriod;
  anchorOn: string;
  periodIndex: number;
  terms: RenewalTerms;
  dueOn: string;
  invoiceKind: "initial" | "renewal";
  createsInvoice: boolean;
  total: number;
  net: number;
  vat: number;
  change: { id: string; status: "applied" | "blocked"; reason: string | null } | null;
  status: "active" | "past_due" | "suspended";
}
function assertTerms(terms: RenewalTerms) {
  assertClpAmount(terms.price);
  assertBillingDuration(terms.duration);
  if (!terms.versionId || !Number.isSafeInteger(terms.maxStudents) || terms.maxStudents <= 0
    || !Number.isSafeInteger(terms.maxUsers) || terms.maxUsers <= 0) {
    throw new BusinessRuleViolationError("El contrato no contiene límites válidos para renovar.");
  }
}

export function quoteSubscriptionRenewal(input: RenewalInput): RenewalQuote {
  assertBillingPeriod(input.currentPeriod);
  assertTerms(input.terms);
  if (daysBetween(input.currentPeriod.endsBefore, input.today) < 0) {
    throw new BusinessRuleViolationError("El período todavía no vence.");
  }
  if (!Number.isSafeInteger(input.periodIndex) || input.periodIndex < 0
    || !Number.isSafeInteger(input.activeStudents) || input.activeStudents < 0
    || !Number.isSafeInteger(input.activeUsers) || input.activeUsers < 0) {
    throw new BusinessRuleViolationError("El índice o el uso del contrato no es válido.");
  }
  const startsOn = input.currentPeriod.endsBefore;
  const transition = input.anchorOn === startsOn && input.periodIndex === 0;
  const current = billingPeriodAt(input.anchorOn, input.terms.duration, input.periodIndex);
  if ((!transition && (current.startsOn !== input.currentPeriod.startsOn || current.endsBefore !== startsOn))
    || (input.status === "trial" && !transition)) {
    throw new BusinessRuleViolationError("Las fechas del contrato requieren conciliación antes de renovar.");
  }
  let terms = input.terms;
  let anchorOn = input.anchorOn;
  let periodIndex = transition ? 0 : input.periodIndex + 1;
  let change: RenewalQuote["change"] = null;
  if (input.scheduledChange) {
    const pending = input.scheduledChange;
    assertTerms(pending.terms);
    if (pending.effectiveOn !== startsOn) {
      throw new BusinessRuleViolationError("La programación no coincide con la próxima renovación.");
    }
    if (input.activeStudents > pending.terms.maxStudents || input.activeUsers > pending.terms.maxUsers) {
      change = {
        id: pending.id, status: "blocked",
        reason: `Uso actual: ${input.activeStudents}/${pending.terms.maxStudents} alumnos y ${input.activeUsers}/${pending.terms.maxUsers} usuarios. Se renovó el plan anterior.`,
      };
    } else {
      terms = pending.terms;
      anchorOn = startsOn;
      periodIndex = 0;
      change = { id: pending.id, status: "applied", reason: null };
    }
  }
  const period = billingPeriodAt(anchorOn, terms.duration, periodIndex);
  if (period.startsOn !== startsOn) throw new BusinessRuleViolationError("La renovación dejaría un intervalo de servicio inconsistente.");
  const dueOn = input.status === "trial" ? input.firstInvoiceDueOn ?? startsOn : startsOn;
  if (daysBetween(startsOn, dueOn) < 0) throw new BusinessRuleViolationError("El vencimiento inicial requiere conciliación.");
  const amounts = includedVat(terms.price);
  return {
    period, anchorOn, periodIndex, terms, dueOn,
    invoiceKind: input.status === "trial" ? "initial" : "renewal",
    createsInvoice: terms.price > 0, total: amounts.total, net: amounts.net, vat: amounts.vat, change,
    status: input.status === "trial" ? "active" : input.status,
  };
}
