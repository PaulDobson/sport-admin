import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { UnauthorizedError } from "@/domain/shared/errors";
import type { RenewalProcessingResult } from "@/domain/saas-administration/renewal-processing";
import type { RenewalAdministrationPort, RenewalProcessingPort } from "../ports/renewal-processing-port";

const manualSchema = z.object({ requestId: z.uuid(), subscriptionId: z.uuid(), expectedPeriodEnd: z.iso.date() });
const batchSchema = z.object({ batchSize: z.number().int().min(1).max(10) });

export async function getSaasRenewalStatus(tenantId: string | null, repository: RenewalAdministrationPort) {
  if (!(await repository.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  return repository.getStatus(parseWithSchema(z.uuid().nullable(), tenantId));
}
export async function renewSaasSubscription(input: unknown, repository: RenewalAdministrationPort) {
  if (!(await repository.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  return repository.process(parseWithSchema(manualSchema, input));
}
export async function processSaasRenewalBatch(input: unknown, deps: {
  renewals: RenewalProcessingPort;
  newRequestId: () => string;
}) {
  const { batchSize } = parseWithSchema(batchSchema, input);
  const results: Exclude<RenewalProcessingResult, { status: "idle" }>[] = [];
  let idle = false;
  for (let index = 0; index < batchSize; index += 1) {
    const requestId = parseWithSchema(z.uuid(), deps.newRequestId());
    const result = await deps.renewals.process({ requestId, subscriptionId: null, expectedPeriodEnd: null });
    if (result.status === "idle") { idle = true; break; }
    results.push(result);
  }
  return { results, processed: results.length, failed: results.filter((r) => r.status === "failed").length, idle };
}
