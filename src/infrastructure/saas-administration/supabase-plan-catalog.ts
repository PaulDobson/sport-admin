import { z } from "zod";
import type { PlanCatalogPort } from "@/application/saas-administration/ports/plan-catalog-port";
import type { PlanVersionHistoryPort } from "@/application/saas-administration/ports/plan-version-history-port";
import type { ArchiveSaasPlanInput, PublishSaasPlanInput } from "@/domain/saas-administration/plan-catalog";
import { BusinessRuleViolationError, ConflictError, NotFoundError, UnauthorizedError } from "@/domain/shared/errors";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

const versionSchema = z.object({
  id: z.uuid(), version_number: z.number().int().positive(),
  name: z.string().min(1), description: z.string().nullable(),
  price: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/),
  duration_unit: z.enum(["days", "months"]), duration_count: z.number().int().positive(),
  trial_days: z.number().int().min(0).max(365),
  max_students: z.number().int().positive(), max_users: z.number().int().positive(),
  features: z.array(z.enum(["reports", "offline", "realtime", "push"])),
  services: z.array(z.string()), legacy: z.boolean(), created_at: z.iso.datetime({ offset: true }),
}).refine((v) => v.legacy || (v.currency === "CLP" && Number.isInteger(v.price)));
const catalogSchema = z.object({ plans: z.array(z.object({
  id: z.uuid(), slug: z.string().min(1), status: z.enum(["active", "archived"]),
  current_version: versionSchema,
})) });
const publishedSchema = z.object({
  plan_id: z.uuid(), version_id: z.uuid(), version_number: z.number().int().positive(),
});
const archivedSchema = z.object({ plan_id: z.uuid(), status: z.literal("archived") });
const historySchema = z.object({
  plan_id: z.uuid(), slug: z.string().min(1), status: z.enum(["active", "archived"]),
  current_version_id: z.uuid().nullable(), queried_at: z.iso.datetime({ offset: true }),
  page: z.number().int().positive(), page_size: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
  versions: z.array(versionSchema.and(z.object({ plan_id: z.uuid() }))).max(100),
});

function mapVersion(version: z.infer<typeof versionSchema>) {
  return {
    id: version.id, versionNumber: version.version_number, name: version.name,
    description: version.description, price: version.price, currency: version.currency,
    durationUnit: version.duration_unit, durationCount: version.duration_count,
    trialDays: version.trial_days, maxStudents: version.max_students,
    maxUsers: version.max_users, features: version.features, services: version.services,
    legacy: version.legacy, createdAt: version.created_at,
  };
}

function parseContract<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BusinessRuleViolationError(
      "El catálogo tiene un formato incompatible. Verifica las migraciones SaaS 0041 a 0043 de este entorno.",
    );
  }
  return result.data;
}

function throwRpcError(error: { code: string; message: string }): never {
  if (error.code === "PGRST202" || error.code === "42883") {
    throw new BusinessRuleViolationError(
      "El catálogo de planes aún no está instalado en esta base de datos. Aplica las migraciones SaaS 0041 a 0043 después de validarlas.",
    );
  }
  if (error.code === "40001") {
    throw new ConflictError("Otro administrador modificó el plan. Recarga la versión vigente antes de confirmar.");
  }
  if (error.code === "23505") {
    throw new ConflictError("La operación ya existe con datos diferentes. Revisa el catálogo antes de volver a intentar.");
  }
  if (error.code === "22023" || error.code === "P0002") {
    throw new BusinessRuleViolationError("No se pudo guardar el plan. Revisa sus datos y comprueba que siga activo.");
  }
  throw error;
}

export class SupabasePlanCatalog implements PlanCatalogPort, PlanVersionHistoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async isPlatformAdmin() {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throw error;
    return data === true;
  }

  async list() {
    const { data, error } = await this.client.rpc("list_saas_plan_catalog");
    if (error) throwRpcError(error);
    return parseContract(catalogSchema, data).plans.map((p) => ({
      id: p.id, slug: p.slug, status: p.status,
      currentVersion: mapVersion(p.current_version),
    }));
  }

  async listVersions(input: { planId: string; page: number; pageSize: number }) {
    const { data, error } = await this.client.rpc("list_saas_plan_versions", {
      target_plan: input.planId, page_number: input.page, page_size: input.pageSize,
    });
    if (error) {
      if (["PGRST202", "42883"].includes(error.code)) throw new BusinessRuleViolationError(
        "El historial de planes requiere aplicar la migración SaaS 0054 después de validarla.",
      );
      if (error.code === "P0002") throw new NotFoundError("Plan", input.planId);
      if (error.code === "42501") throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
      if (error.code === "22023") throw new BusinessRuleViolationError("Revisa el plan y la página del historial antes de continuar.");
      throw error;
    }
    const parsed = historySchema.safeParse(data);
    if (!parsed.success) throw new BusinessRuleViolationError(
      "El historial tiene un formato incompatible. Verifica la migración SaaS 0054 de este entorno.",
    );
    const result = parsed.data;
    if (result.plan_id !== input.planId || result.page !== input.page || result.page_size !== input.pageSize
      || result.versions.length > input.pageSize
      || result.versions.some((version) => version.plan_id !== input.planId)
      || new Set(result.versions.map((version) => version.id)).size !== result.versions.length) {
      throw new BusinessRuleViolationError("El historial no corresponde al plan o la página solicitados.");
    }
    return {
      planId: result.plan_id, slug: result.slug, status: result.status,
      currentVersionId: result.current_version_id, queriedAt: result.queried_at,
      page: result.page, pageSize: result.page_size, total: result.total,
      versions: result.versions.map(mapVersion),
    };
  }

  async publish(input: PublishSaasPlanInput) {
    const t = input.terms;
    const { data, error } = await this.client.rpc("publish_saas_plan_version", {
      target_plan: input.planId, expected_version: input.expectedVersionId,
      operation_id: input.operationId, change_reason: input.reason,
      terms: {
        name: t.name, description: t.description, price: t.price,
        duration_unit: t.durationUnit, duration_count: t.durationCount,
        trial_days: t.trialDays, max_students: t.maxStudents, max_users: t.maxUsers,
        features: t.features, services: t.services,
      },
    });
    if (error) throwRpcError(error);
    const result = parseContract(publishedSchema, data);
    return { planId: result.plan_id, versionId: result.version_id, versionNumber: result.version_number };
  }

  async archive(input: ArchiveSaasPlanInput) {
    const { data, error } = await this.client.rpc("archive_saas_plan", {
      target_plan: input.planId, expected_version: input.expectedVersionId,
      operation_id: input.operationId, change_reason: input.reason,
    });
    if (error) throwRpcError(error);
    const result = parseContract(archivedSchema, data);
    if (result.plan_id !== input.planId) {
      throw new BusinessRuleViolationError("La confirmación de archivo corresponde a otro plan.");
    }
  }
}
