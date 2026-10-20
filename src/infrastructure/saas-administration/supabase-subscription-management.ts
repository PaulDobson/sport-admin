import { z } from "zod";
import type { SubscriptionManagementPort } from "@/application/saas-administration/ports/subscription-management-port";
import type { PlanChangePort } from "@/application/saas-administration/ports/plan-change-port";
import type { CancelPlanChangeInput, PlanChangeConfirmation, PlanChangeRequest } from "@/domain/saas-administration/plan-change-management";
import { billingRate } from "@/domain/saas-administration/billing-money";
import { quotePlanChange } from "@/domain/saas-administration/plan-change";
import type { AssignmentConfirmation, AssignmentRequest } from "@/domain/saas-administration/subscription-management";
import { includedVat, maxClpAmount } from "@/domain/saas-administration/billing-money";
import { BusinessRuleViolationError, ConflictError, NotFoundError, UnauthorizedError } from "@/domain/shared/errors";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

const clp = z.number().int().min(0).max(maxClpAmount);
const date = z.iso.date();
const tenantStatus = z.enum(["pending", "trial", "active", "suspended", "cancelled"]);
const managementSchema = z.object({
  tenant_id: z.uuid(), tenant_name: z.string().min(1), tenant_status: tenantStatus,
  business_date: date, active_students: z.number().int().nonnegative(), active_users: z.number().int().nonnegative(),
  scheduled_change: z.object({
    id: z.uuid(), plan_name: z.string().min(1), price: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), effective_on: date,
    status: z.enum(["scheduled", "blocked"]), reason: z.string(), blocked_reason: z.string().nullable(),
  }).nullable(),
  subscription: z.object({
    id: z.uuid(), plan_id: z.uuid(), plan_version_id: z.uuid().nullable(),
    status: z.enum(["trial", "active", "past_due", "suspended"]),
    payment_status: z.enum(["pending", "paid", "failed", "partial", "not_due"]),
    starts_on: date, period_starts_on: date, period_end_exclusive: date,
    next_billing_date: date.nullable(), price: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/),
    contract_snapshot: z.object({ name: z.string().min(1) }).passthrough().nullable(),
    duration_unit: z.enum(["days", "months"]).nullable(), duration_count: z.number().int().positive().nullable(),
  }).refine((s) => s.period_end_exclusive > s.period_starts_on).nullable(),
});
const previewSchema = z.object({
  tenant_id: z.uuid(), tenant_name: z.string().min(1), tenant_status: tenantStatus,
  plan_id: z.uuid(), plan_version_id: z.uuid(), plan_name: z.string().min(1),
  version_number: z.number().int().positive(), fingerprint: z.string().regex(/^[a-f0-9]{32}$/),
  business_date: date, starts_on: date, use_trial: z.boolean(), trial_end_exclusive: date.nullable(),
  first_paid_period: z.object({ starts_on: date, end_exclusive: date }),
  due_on: date, price: clp, currency: z.literal("CLP"), initial_amount: clp, initial_invoice: z.boolean(),
  net: clp, vat: clp, duration_unit: z.enum(["days", "months"]), duration_count: z.number().int().positive(),
  active_students: z.number().int().nonnegative(), active_users: z.number().int().nonnegative(),
  max_students: z.number().int().positive(), max_users: z.number().int().positive(),
  features: z.array(z.enum(["reports", "offline", "realtime", "push"])), services: z.array(z.string()),
  contract_snapshot: z.object({ id: z.uuid(), name: z.string(), price: clp, currency: z.literal("CLP") }).passthrough(),
}).superRefine((p, ctx) => {
  const valid = p.first_paid_period.end_exclusive > p.first_paid_period.starts_on
    && p.initial_amount === (p.use_trial ? 0 : p.price)
    && p.net === includedVat(p.initial_amount).net
    && p.initial_amount === p.net + p.vat
    && p.initial_invoice === (!p.use_trial && p.price > 0)
    && p.active_students <= p.max_students && p.active_users <= p.max_users
    && (p.use_trial ? p.trial_end_exclusive === p.first_paid_period.starts_on && p.trial_end_exclusive > p.starts_on
      : p.trial_end_exclusive === null && p.first_paid_period.starts_on === p.starts_on)
    && p.contract_snapshot.id === p.plan_version_id && p.contract_snapshot.price === p.price;
  if (!valid) ctx.addIssue({ code: "custom", message: "Inconsistent assignment quote" });
});
const resultSchema = z.object({
  tenant_id: z.uuid(), subscription_id: z.uuid(), plan_version_id: z.uuid(), invoice_id: z.uuid().nullable(),
  status: z.enum(["trial", "active"]), initial_amount: clp, period_end_exclusive: date,
}).refine((r) => r.invoice_id !== null ? r.status === "active" && r.initial_amount > 0 : r.initial_amount === 0);
const integerString = z.string().regex(/^\d+$/);
const positiveIntegerString = integerString.refine((v) => BigInt(v) > BigInt(0));
const changePreviewSchema = z.object({
  tenant_id: z.uuid(), subscription_id: z.uuid(), current_version_id: z.uuid(),
  current_plan_name: z.string().nullable(), plan_version_id: z.uuid(), plan_name: z.string().min(1),
  version_number: z.number().int().positive(), fingerprint: z.string().regex(/^[a-f0-9]{32}$/),
  kind: z.enum(["upgrade", "downgrade", "equivalent"]), business_date: date, effective_on: date,
  period_starts_on: date, period_end_exclusive: date, remaining_days: z.number().int().positive(),
  current_rate_numerator: integerString, current_rate_denominator: positiveIntegerString,
  new_rate_numerator: integerString, new_rate_denominator: positiveIntegerString,
  amount_due: clp, net: clp, vat: clp, price: clp, currency: z.literal("CLP"),
  duration_unit: z.enum(["days", "months"]), duration_count: z.number().int().positive(),
  active_students: z.number().int().nonnegative(), active_users: z.number().int().nonnegative(),
  max_students: z.number().int().positive(), max_users: z.number().int().positive(),
  features: z.array(z.enum(["reports", "offline", "realtime", "push"])), services: z.array(z.string()),
});
const changeResultSchema = z.object({
  tenant_id: z.uuid(), subscription_id: z.uuid(), plan_version_id: z.uuid(),
  kind: z.enum(["upgrade", "downgrade", "equivalent"]), effective_on: date, amount_due: clp,
  invoice_id: z.uuid().nullable(), scheduled_change_id: z.uuid().nullable(),
}).refine((r) => r.kind === "upgrade"
  ? r.scheduled_change_id === null && (r.amount_due > 0 ? r.invoice_id !== null : r.invoice_id === null)
  : r.amount_due === 0 && r.invoice_id === null && r.scheduled_change_id !== null);
const cancelledSchema = z.object({ tenant_id: z.uuid(), scheduled_change_id: z.uuid(), status: z.literal("cancelled") });

function parseContract<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new BusinessRuleViolationError(
    "La respuesta de suscripciones es incompatible. Verifica las migraciones SaaS 0041 a 0046 de este entorno.",
  );
  return result.data;
}
function throwRpcError(error: { code: string; message: string }): never {
  if (error.code === "PGRST202" || error.code === "42883") throw new BusinessRuleViolationError(
    "La gestión de suscripciones no está instalada. Verifica las migraciones SaaS 0041 a 0046 antes de continuar.",
  );
  if (error.code === "42501") throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  if (error.code === "40001") throw new ConflictError("La previsualización cambió. Revisa nuevamente las condiciones antes de confirmar.");
  if (error.code === "23505") throw new ConflictError("El tenant ya tiene una suscripción o la operación fue utilizada con datos diferentes. Revisa el contrato vigente.");
  if (error.code === "P0002") throw new NotFoundError("Tenant o versión del plan", "");
  if (error.code === "22023") throw new BusinessRuleViolationError(
    "No se puede confirmar el plan. Revisa fechas, prueba, precio CLP y límites frente al uso actual. Si hay un cambio pendiente, cancélalo antes de solicitar otro; los períodos vencidos o las programaciones antiguas de límites requieren conciliación.",
  );
  throw error;
}
function args(input: AssignmentRequest) {
  return {
    target_tenant: input.tenantId, target_version: input.planVersionId,
    starts_on: input.startsOn, use_trial: input.useTrial, due_on: input.dueOn,
  };
}

export class SupabaseSubscriptionManagement implements SubscriptionManagementPort, PlanChangePort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async isPlatformAdmin() {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throwRpcError(error);
    return data === true;
  }
  async getManagement(tenantId: string) {
    const { data, error } = await this.client.rpc("get_saas_subscription_management", { target_tenant: tenantId });
    if (error) throwRpcError(error);
    const r = parseContract(managementSchema, data);
    if (r.tenant_id !== tenantId) throw new BusinessRuleViolationError("La respuesta corresponde a otro tenant.");
    const s = r.subscription;
    return {
      tenantId: r.tenant_id, tenantName: r.tenant_name, tenantStatus: r.tenant_status,
      businessDate: r.business_date, activeStudents: r.active_students, activeUsers: r.active_users,
      scheduledChange: r.scheduled_change ? {
        id: r.scheduled_change.id, planName: r.scheduled_change.plan_name, price: r.scheduled_change.price,
        currency: r.scheduled_change.currency, effectiveOn: r.scheduled_change.effective_on,
        status: r.scheduled_change.status, reason: r.scheduled_change.reason, blockedReason: r.scheduled_change.blocked_reason,
      } : null,
      subscription: s ? {
        id: s.id, planId: s.plan_id, planVersionId: s.plan_version_id,
        planName: s.contract_snapshot?.name ?? null, status: s.status, paymentStatus: s.payment_status,
        startsOn: s.starts_on, periodStartsOn: s.period_starts_on, periodEndExclusive: s.period_end_exclusive,
        nextBillingDate: s.next_billing_date, price: s.price, currency: s.currency,
        durationUnit: s.duration_unit, durationCount: s.duration_count,
      } : null,
    };
  }
  async previewAssignment(input: AssignmentRequest) {
    const { data, error } = await this.client.rpc("preview_saas_subscription_assignment", args(input));
    if (error) throwRpcError(error);
    const p = parseContract(previewSchema, data);
    if (p.tenant_id !== input.tenantId || p.plan_version_id !== input.planVersionId
      || p.starts_on !== input.startsOn || p.use_trial !== input.useTrial
      || (input.dueOn !== null && p.due_on !== input.dueOn)) {
      throw new BusinessRuleViolationError("La previsualización no corresponde a los datos solicitados.");
    }
    return {
      ...input, fingerprint: p.fingerprint, tenantName: p.tenant_name, tenantStatus: p.tenant_status,
      businessDate: p.business_date, planId: p.plan_id, planName: p.plan_name, versionNumber: p.version_number,
      trialEndExclusive: p.trial_end_exclusive,
      firstPaidPeriod: { startsOn: p.first_paid_period.starts_on, endsBefore: p.first_paid_period.end_exclusive },
      resolvedDueOn: p.due_on, price: p.price, initialAmount: p.initial_amount, createsInvoice: p.initial_invoice,
      net: p.net, vat: p.vat, durationUnit: p.duration_unit, durationCount: p.duration_count,
      activeStudents: p.active_students, activeUsers: p.active_users,
      maxStudents: p.max_students, maxUsers: p.max_users, features: p.features, services: p.services,
    };
  }
  async confirmAssignment(input: AssignmentConfirmation) {
    const { data, error } = await this.client.rpc("confirm_saas_subscription_assignment", {
      ...args(input), expected_fingerprint: input.fingerprint,
      operation_id: input.operationId, change_reason: input.reason,
    });
    if (error) throwRpcError(error);
    const r = parseContract(resultSchema, data);
    if (r.tenant_id !== input.tenantId || r.plan_version_id !== input.planVersionId
      || r.status !== (input.useTrial ? "trial" : "active")) {
      throw new BusinessRuleViolationError("La confirmación no corresponde al contrato solicitado. Revisa el tenant antes de reintentar.");
    }
    return {
      tenantId: r.tenant_id, subscriptionId: r.subscription_id, planVersionId: r.plan_version_id,
      invoiceId: r.invoice_id, status: r.status, initialAmount: r.initial_amount, periodEndExclusive: r.period_end_exclusive,
    };
  }
  async previewPlanChange(input: PlanChangeRequest) {
    const { data, error } = await this.client.rpc("preview_saas_plan_change", {
      target_tenant: input.tenantId, target_version: input.planVersionId,
    });
    if (error) throwRpcError(error);
    const p = parseContract(changePreviewSchema, data);
    if (p.tenant_id !== input.tenantId || p.plan_version_id !== input.planVersionId) {
      throw new BusinessRuleViolationError("La previsualización corresponde a otro contrato.");
    }
    const current = billingRate(BigInt(p.current_rate_numerator), BigInt(p.current_rate_denominator));
    const next = billingRate(BigInt(p.new_rate_numerator), BigInt(p.new_rate_denominator));
    const checked = quotePlanChange({
      currentDailyRate: current, currentPeriod: { startsOn: p.period_starts_on, endsBefore: p.period_end_exclusive },
      onDate: p.business_date, newPrice: p.price, newDuration: { unit: p.duration_unit, count: p.duration_count },
    });
    if (checked.kind !== p.kind || checked.amountDue !== p.amount_due || checked.effectiveOn !== p.effective_on
      || checked.remainingDays !== p.remaining_days || includedVat(p.amount_due).net !== p.net
      || p.amount_due !== p.net + p.vat || p.active_students > p.max_students || p.active_users > p.max_users
      || checked.newDailyRate.numerator !== next.numerator || checked.newDailyRate.denominator !== next.denominator) {
      throw new BusinessRuleViolationError("El cálculo recibido no coincide con las reglas de prorrateo. No confirmes este cambio.");
    }
    return {
      ...input, subscriptionId: p.subscription_id, currentVersionId: p.current_version_id,
      currentPlanName: p.current_plan_name, planName: p.plan_name, versionNumber: p.version_number,
      fingerprint: p.fingerprint, kind: p.kind, businessDate: p.business_date, effectiveOn: p.effective_on,
      periodStartsOn: p.period_starts_on, periodEndExclusive: p.period_end_exclusive, remainingDays: p.remaining_days,
      currentRateNumerator: p.current_rate_numerator, currentRateDenominator: p.current_rate_denominator,
      newRateNumerator: p.new_rate_numerator, newRateDenominator: p.new_rate_denominator,
      amountDue: p.amount_due, net: p.net, vat: p.vat, price: p.price,
      durationUnit: p.duration_unit, durationCount: p.duration_count,
      activeStudents: p.active_students, activeUsers: p.active_users, maxStudents: p.max_students,
      maxUsers: p.max_users, features: p.features, services: p.services,
    };
  }
  async confirmPlanChange(input: PlanChangeConfirmation) {
    const { data, error } = await this.client.rpc("confirm_saas_plan_change", {
      target_tenant: input.tenantId, target_version: input.planVersionId, expected_fingerprint: input.fingerprint,
      operation_id: input.operationId, change_reason: input.reason,
    });
    if (error) throwRpcError(error);
    const r = parseContract(changeResultSchema, data);
    if (r.tenant_id !== input.tenantId || r.plan_version_id !== input.planVersionId) {
      throw new BusinessRuleViolationError("La confirmación corresponde a otro contrato. Revisa el tenant antes de reintentar.");
    }
    return {
      ...input, subscriptionId: r.subscription_id, kind: r.kind, effectiveOn: r.effective_on,
      amountDue: r.amount_due, invoiceId: r.invoice_id, scheduledChangeId: r.scheduled_change_id,
    };
  }
  async cancelPlanChange(input: CancelPlanChangeInput) {
    const { data, error } = await this.client.rpc("cancel_saas_scheduled_change", {
      target_tenant: input.tenantId, target_change: input.scheduledChangeId,
      operation_id: input.operationId, change_reason: input.reason,
    });
    if (error) throwRpcError(error);
    const r = parseContract(cancelledSchema, data);
    if (r.tenant_id !== input.tenantId || r.scheduled_change_id !== input.scheduledChangeId) {
      throw new BusinessRuleViolationError("La cancelación corresponde a otro cambio.");
    }
  }
}
