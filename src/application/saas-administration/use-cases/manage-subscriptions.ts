import { z } from "zod";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { SubscriptionManagementPort } from "../ports/subscription-management-port";

const requestSchema = z.object({
  tenantId: z.uuid({ error: "Selecciona un tenant válido." }),
  planVersionId: z.uuid({ error: "Selecciona una versión del plan." }),
  startsOn: z.iso.date({ error: "Ingresa una fecha de inicio válida." }),
  useTrial: z.boolean(),
  dueOn: z.iso.date({ error: "Ingresa un vencimiento válido." }).nonempty(),
});
const confirmationSchema = requestSchema.extend({
  fingerprint: z
    .string()
    .regex(/^[a-f0-9]{32}$/, "Debes revisar una previsualización vigente."),
  operationId: z.uuid({ error: "El identificador de operación no es válido." }),
  reason: z
    .string()
    .trim()
    .min(3, "Ingresa un motivo de al menos 3 caracteres.")
    .max(500, "El motivo admite hasta 500 caracteres."),
});

async function assertAdmin(repository: SubscriptionManagementPort) {
  if (!(await repository.isPlatformAdmin())) {
    throw new UnauthorizedError(
      "Se requiere acceso de administrador de plataforma.",
    );
  }
}

export async function getSaasSubscriptionManagement(
  tenantId: string,
  repository: SubscriptionManagementPort,
) {
  await assertAdmin(repository);
  return repository.getManagement(parseWithSchema(z.uuid(), tenantId));
}

export async function previewSaasAssignment(
  input: unknown,
  repository: SubscriptionManagementPort,
) {
  await assertAdmin(repository);
  return repository.previewAssignment(parseWithSchema(requestSchema, input));
}

export async function confirmSaasAssignment(
  input: unknown,
  repository: SubscriptionManagementPort,
) {
  await assertAdmin(repository);
  return repository.confirmAssignment(
    parseWithSchema(confirmationSchema, input),
  );
}
