import { z } from "zod";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { PlanChangePort } from "../ports/plan-change-port";

const requestSchema = z.object({ tenantId: z.uuid(), planVersionId: z.uuid() });
const operationSchema = z.object({
  operationId: z.uuid(), reason: z.string().trim()
    .min(3, "Ingresa un motivo de al menos 3 caracteres.").max(500, "El motivo admite hasta 500 caracteres."),
});
const confirmSchema = requestSchema.extend({
  ...operationSchema.shape,
  fingerprint: z.string().regex(/^[a-f0-9]{32}$/, "Revisa una previsualización vigente antes de confirmar."),
});
const cancelSchema = operationSchema.extend({ tenantId: z.uuid(), scheduledChangeId: z.uuid() });
async function assertAdmin(repository: PlanChangePort) {
  if (!(await repository.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
}
export async function previewSaasPlanChange(input: unknown, repository: PlanChangePort) {
  await assertAdmin(repository);
  return repository.previewPlanChange(parseWithSchema(requestSchema, input));
}
export async function confirmSaasPlanChange(input: unknown, repository: PlanChangePort) {
  await assertAdmin(repository);
  return repository.confirmPlanChange(parseWithSchema(confirmSchema, input));
}
export async function cancelSaasPlanChange(input: unknown, repository: PlanChangePort) {
  await assertAdmin(repository);
  await repository.cancelPlanChange(parseWithSchema(cancelSchema, input));
}
