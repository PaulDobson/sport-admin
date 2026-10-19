import { BusinessRuleViolationError, ConflictError, ValidationError } from "@/domain/shared/errors";
import { assertClpAmount, includedVat } from "./billing-money";
import { billingPeriodAt, daysBetween, type BillingPeriod } from "./billing-period";
import type { SaasCatalogPlan } from "./plan-catalog";

export interface SubscriptionAssignmentQuote {
  planId: string;
  planVersionId: string;
  startsOn: string;
  trialPeriod: BillingPeriod | null;
  firstPaidPeriod: BillingPeriod;
  dueOn: string;
  initialInvoice: ReturnType<typeof includedVat> | null;
  status: "trial" | "active";
  paymentStatus: "pending" | "not_due";
}

export function quoteSubscriptionAssignment(input: {
  plan: SaasCatalogPlan;
  startsOn: string;
  today: string;
  dueOn?: string;
  useTrial: boolean;
  hasCurrentSubscription: boolean;
  activeStudents: number;
  activeUsers: number;
}): SubscriptionAssignmentQuote {
  if (input.hasCurrentSubscription) {
    throw new ConflictError("El tenant ya tiene una suscripción vigente. Utiliza el cambio de plan.");
  }
  if (input.plan.status !== "active") {
    throw new BusinessRuleViolationError("Un plan archivado no admite nuevas asignaciones.");
  }
  const version = input.plan.currentVersion;
  if (version.currency !== "CLP") {
    throw new BusinessRuleViolationError("Publica una versión en CLP antes de asignar este plan histórico.");
  }
  assertClpAmount(version.price);
  if (daysBetween(input.today, input.startsOn) < 0) {
    throw new ValidationError([{ path: "startsOn", message: "La suscripción no puede comenzar en una fecha pasada." }]);
  }
  if (!Number.isInteger(version.trialDays) || version.trialDays < 0 || version.trialDays > 365
    || (input.useTrial && version.trialDays === 0)) {
    throw new ValidationError([{ path: "useTrial", message: "El período de prueba solicitado no está disponible." }]);
  }
  for (const [usage, limit, path, label] of [
    [input.activeStudents, version.maxStudents, "maxStudents", "alumnos"],
    [input.activeUsers, version.maxUsers, "maxUsers", "usuarios"],
  ] as const) {
    if (!Number.isSafeInteger(usage) || usage < 0 || !Number.isSafeInteger(limit) || limit <= 0) {
      throw new ValidationError([{ path, message: "El uso y los límites deben ser enteros válidos." }]);
    }
    if (usage > limit) {
      throw new BusinessRuleViolationError(`El tenant tiene ${usage} ${label} activos; el plan permite ${limit}.`);
    }
  }
  const trialPeriod = input.useTrial
    ? billingPeriodAt(input.startsOn, { unit: "days", count: version.trialDays })
    : null;
  const firstPaidPeriod = billingPeriodAt(trialPeriod?.endsBefore ?? input.startsOn, {
    unit: version.durationUnit, count: version.durationCount,
  });
  const dueOn = input.dueOn ?? firstPaidPeriod.startsOn;
  if (daysBetween(input.today, dueOn) < 0) {
    throw new ValidationError([{ path: "dueOn", message: "El vencimiento del cobro no puede estar en el pasado." }]);
  }
  const initialInvoice = !trialPeriod && version.price > 0 ? includedVat(version.price) : null;
  return {
    planId: input.plan.id, planVersionId: version.id, startsOn: input.startsOn,
    trialPeriod, firstPaidPeriod, dueOn, initialInvoice,
    status: trialPeriod ? "trial" : "active",
    paymentStatus: initialInvoice ? "pending" : "not_due",
  };
}
