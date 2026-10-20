import { z } from "zod";
import { maxClpAmount } from "@/domain/saas-administration/billing-money";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { PlanCatalogPort } from "../ports/plan-catalog-port";
import type { PlanVersionHistoryPort } from "../ports/plan-version-history-port";

const positiveInteger = z.number({ error: "Ingresa un número entero positivo." })
  .int("Usa un número entero.").min(1, "El valor mínimo es 1.")
  .max(2_147_483_647, "El valor excede el máximo permitido.");
const reasonSchema = z.string().trim().min(3, "Indica un motivo de al menos 3 caracteres.")
  .max(500, "El motivo admite hasta 500 caracteres.");
const termsSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del plan.").max(160, "El nombre admite hasta 160 caracteres."),
  description: z.string().trim().max(2000, "La descripción admite hasta 2000 caracteres.").nullable(),
  price: z.number({ error: "Ingresa un precio válido en pesos." })
    .int("El precio debe expresarse en pesos enteros.").min(0, "El precio no puede ser negativo.")
    .max(maxClpAmount, "El precio excede el máximo permitido."),
  durationUnit: z.enum(["days", "months"], { error: "Selecciona días o meses." }),
  durationCount: positiveInteger,
  trialDays: z.number({ error: "Ingresa los días de prueba." })
    .int("Los días de prueba deben ser enteros.").min(0, "La prueba no puede ser negativa.")
    .max(365, "La prueba admite hasta 365 días."),
  maxStudents: positiveInteger,
  maxUsers: positiveInteger,
  features: z.array(z.enum(["reports", "offline", "realtime", "push"], { error: "La función seleccionada no está soportada." }))
    .max(4, "Solo se admiten las cuatro funciones soportadas.")
    .refine((features) => new Set(features).size === features.length, "No repitas funciones."),
  services: z.array(z.string().trim().min(1, "Un servicio no puede estar vacío.")
    .max(500, "Cada servicio admite hasta 500 caracteres.")).max(50, "Se admiten hasta 50 servicios."),
});
const publishSchema = z.object({
  planId: z.string().uuid().nullable(),
  expectedVersionId: z.string().uuid().nullable(),
  operationId: z.string().uuid(),
  terms: termsSchema,
  reason: reasonSchema,
}).refine((input) => (input.planId === null) === (input.expectedVersionId === null), {
  path: ["expectedVersionId"],
  message: "Una edición requiere la versión vigente; un plan nuevo no puede tenerla.",
});
const archiveSchema = z.object({
  planId: z.string().uuid(),
  expectedVersionId: z.string().uuid(),
  operationId: z.string().uuid(),
  reason: reasonSchema,
});

async function assertPlatformAdmin(catalog: PlanCatalogPort) {
  if (!(await catalog.isPlatformAdmin())) {
    throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  }
}

export async function listSaasPlanCatalog(catalog: PlanCatalogPort) {
  await assertPlatformAdmin(catalog);
  return catalog.list();
}

export async function listSaasPlanVersions(input: unknown, history: PlanVersionHistoryPort) {
  if (!(await history.isPlatformAdmin())) {
    throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  }
  return history.listVersions(parseWithSchema(z.object({
    planId: z.uuid("El plan solicitado no es válido."),
    page: z.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  }), input));
}

export async function publishSaasPlanVersion(input: unknown, catalog: PlanCatalogPort) {
  await assertPlatformAdmin(catalog);
  return catalog.publish(parseWithSchema(publishSchema, input));
}

export async function archiveSaasPlan(input: unknown, catalog: PlanCatalogPort) {
  await assertPlatformAdmin(catalog);
  await catalog.archive(parseWithSchema(archiveSchema, input));
}
