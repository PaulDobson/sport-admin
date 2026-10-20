import { z } from "zod";
import { collectionStatuses } from "@/domain/saas-administration/collections";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { CollectionsPort } from "../ports/collections-port";

const filtersSchema = z.object({
  tenantId: z.uuid("El tenant seleccionado no es válido.").nullable().default(null),
  query: z.string().trim().max(160, "La búsqueda admite hasta 160 caracteres.").default(""),
  status: z.enum(collectionStatuses, { error: "Selecciona un estado de cobro válido." }).default("all"),
  currency: z.string().regex(/^[A-Z]{3}$/, "Usa una moneda de tres letras, por ejemplo CLP.").nullable().default(null),
  dueFrom: z.iso.date("Ingresa una fecha inicial válida.").nullable().default(null),
  dueUntil: z.iso.date("Ingresa una fecha final válida.").nullable().default(null),
  page: z.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
}).refine((v) => !v.dueFrom || !v.dueUntil || v.dueFrom <= v.dueUntil, {
  path: ["dueUntil"], message: "El vencimiento final no puede ser anterior al inicial.",
});

export function parseCollectionFilters(input: unknown) {
  return parseWithSchema(filtersSchema, input);
}

async function authorize(port: CollectionsPort) {
  if (!(await port.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
}

export async function listSaasCollections(input: unknown, port: CollectionsPort) {
  await authorize(port);
  return port.list(parseCollectionFilters(input));
}

export async function getSaasCollection(invoiceId: unknown, port: CollectionsPort) {
  await authorize(port);
  return port.get(parseWithSchema(z.uuid(), invoiceId));
}
