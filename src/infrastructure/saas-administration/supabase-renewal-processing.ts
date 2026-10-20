import { z } from "zod";
import type { RenewalAdministrationPort } from "@/application/saas-administration/ports/renewal-processing-port";
import type { RenewalProcessingRequest, RenewalProcessingResult, RenewalProcessorStatus } from "@/domain/saas-administration/renewal-processing";
import { BusinessRuleViolationError, ConflictError, UnauthorizedError } from "@/domain/shared/errors";
import { maxClpAmount } from "@/domain/saas-administration/billing-money";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

const resultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({
    status: z.literal("failed"), tenant_id: z.uuid(), subscription_id: z.uuid(), period_starts_on: z.iso.date(),
    error_code: z.string().regex(/^[0-9A-Z]{5}$/), message: z.string().min(1),
  }),
  z.object({
    status: z.literal("renewed"), tenant_id: z.uuid(), subscription_id: z.uuid(), plan_version_id: z.uuid(),
    period_starts_on: z.iso.date(), period_end_exclusive: z.iso.date(), due_on: z.iso.date(),
    amount: z.number().int().min(0).max(maxClpAmount), invoice_id: z.uuid().nullable(),
    change_status: z.enum(["applied", "blocked"]).nullable(), blocked_reason: z.string().min(1).nullable(),
  }),
]).superRefine((r, ctx) => {
  if (r.status !== "renewed") return;
  if (r.period_end_exclusive <= r.period_starts_on || r.due_on < r.period_starts_on
    || (r.amount > 0) !== (r.invoice_id !== null) || (r.change_status === "blocked") !== (r.blocked_reason !== null)) {
    ctx.addIssue({ code: "custom", message: "Inconsistent renewal result" });
  }
});
const timestamp = z.iso.datetime({ offset: true });
const failureSchema = z.object({
  subscription_id: z.uuid(), tenant_id: z.uuid(), tenant_name: z.string().min(1), period_starts_on: z.iso.date(),
  attempt_count: z.number().int().min(1).max(3), next_attempt_at: timestamp.nullable(),
  error_code: z.string().regex(/^[0-9A-Z]{5}$/),
}).refine((r) => (r.attempt_count === 3) === (r.next_attempt_at === null));
const statusSchema = z.object({
  business_date: z.iso.date(), last_run_at: timestamp.nullable(), last_worker_run_at: timestamp.nullable(), due_count: z.number().int().nonnegative(),
  failures: z.array(failureSchema).max(50),
  blocked_changes: z.array(z.object({
    id: z.uuid(), subscription_id: z.uuid(), tenant_id: z.uuid(), tenant_name: z.string().min(1),
    effective_on: z.iso.date(), blocked_reason: z.string().min(1),
  })).max(50),
});
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new BusinessRuleViolationError("Respuesta incompatible del procesador. Verifica la migración SaaS 0047 antes de habilitar renovaciones.");
  return result.data;
}
function throwRpcError(error: { code: string; message: string }): never {
  if (error.code === "PGRST202" || error.code === "42883") throw new BusinessRuleViolationError("Falta instalar la migración SaaS 0047 del procesador de renovaciones.");
  if (error.code === "42501") throw new UnauthorizedError("No tienes permiso para procesar renovaciones.");
  if (error.code === "40001" || error.code === "23505") throw new ConflictError("El período o la operación cambió. Actualiza el contrato antes de reintentar.");
  if (error.code === "22023") throw new BusinessRuleViolationError("La solicitud de renovación requiere una suscripción y un período válidos.");
  throw error;
}
export class SupabaseRenewalProcessing implements RenewalAdministrationPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async isPlatformAdmin() {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throwRpcError(error);
    return parse(z.boolean(), data);
  }
  async process(input: RenewalProcessingRequest): Promise<RenewalProcessingResult> {
    const { data, error } = await this.client.rpc("process_saas_subscription_renewal", {
      request_id: input.requestId, target_subscription: input.subscriptionId, expected_period_end: input.expectedPeriodEnd,
    });
    if (error) throwRpcError(error);
    const r = parse(resultSchema, data);
    if (input.subscriptionId !== null && (r.status === "idle" || r.subscription_id !== input.subscriptionId
      || r.period_starts_on !== input.expectedPeriodEnd)) {
      throw new BusinessRuleViolationError("La renovación recibida no corresponde al período solicitado.");
    }
    if (r.status === "idle") return r;
    if (r.status === "failed") return {
      status: r.status, tenantId: r.tenant_id, subscriptionId: r.subscription_id,
      periodStartsOn: r.period_starts_on, errorCode: r.error_code, message: r.message,
    };
    return {
      status: r.status, tenantId: r.tenant_id, subscriptionId: r.subscription_id, planVersionId: r.plan_version_id,
      periodStartsOn: r.period_starts_on, periodEndExclusive: r.period_end_exclusive, dueOn: r.due_on,
      amount: r.amount, invoiceId: r.invoice_id, changeStatus: r.change_status, blockedReason: r.blocked_reason,
    };
  }
  async getStatus(tenantId: string | null): Promise<RenewalProcessorStatus> {
    const { data, error } = await this.client.rpc("get_saas_renewal_status", { target_tenant: tenantId });
    if (error) throwRpcError(error);
    const r = parse(statusSchema, data);
    if (tenantId !== null && [...r.failures, ...r.blocked_changes].some((item) => item.tenant_id !== tenantId)) {
      throw new BusinessRuleViolationError("El estado del procesador contiene otro tenant.");
    }
    return {
      businessDate: r.business_date, lastRunAt: r.last_run_at, lastWorkerRunAt: r.last_worker_run_at, dueCount: r.due_count,
      failures: r.failures.map((f) => ({
        subscriptionId: f.subscription_id, tenantId: f.tenant_id, tenantName: f.tenant_name,
        periodStartsOn: f.period_starts_on, attemptCount: f.attempt_count,
        nextAttemptAt: f.next_attempt_at, errorCode: f.error_code,
      })),
      blockedChanges: r.blocked_changes.map((c) => ({
        id: c.id, subscriptionId: c.subscription_id, tenantId: c.tenant_id, tenantName: c.tenant_name,
        effectiveOn: c.effective_on, blockedReason: c.blocked_reason,
      })),
    };
  }
}
