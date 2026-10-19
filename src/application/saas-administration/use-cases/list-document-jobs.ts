import { z } from "zod";
import { documentJobKinds, documentJobFilters } from "@/domain/saas-administration/document-jobs";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { DocumentJobsPort } from "../ports/document-jobs-port";

const filtersSchema = z.object({
  query: z.string().trim().max(160, "La búsqueda admite hasta 160 caracteres.").default(""),
  kind: z.enum(documentJobKinds, { error: "Selecciona un tipo de trabajo válido." }).default("all"),
  status: z.enum(documentJobFilters, { error: "Selecciona un estado de trabajo válido." }).default("attention"),
  page: z.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export function parseDocumentJobFilters(input: unknown) {
  return parseWithSchema(filtersSchema, input);
}

export async function listSaasDocumentJobs(input: unknown, port: DocumentJobsPort) {
  if (!(await port.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  return port.listDocumentJobs(parseDocumentJobFilters(input));
}
