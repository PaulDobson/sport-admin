import { parseCollectionFilters } from "@/application/saas-administration/use-cases/list-collections";
import type { CollectionFilters, CollectionStatusFilter } from "@/domain/saas-administration/collections";
import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";

export type CollectionSearch = {
  tenant?: string; q?: string; status?: string; currency?: string; from?: string; until?: string; page?: string;
};
const searchSchema = z.object({
  tenant: z.string().optional(), q: z.string().optional(), status: z.string().optional(),
  currency: z.string().optional(), from: z.string().optional(), until: z.string().optional(), page: z.string().optional(),
});
export const collectionStatusLabels: Record<CollectionStatusFilter, string> = {
  all: "Todos", open: "Pendiente", past_due: "Vencido", paid: "Pagado",
  draft: "Borrador", void: "Anulado", refunded: "Reembolsado",
};
export function collectionFiltersFromSearch(input: unknown): CollectionFilters {
  const params = parseWithSchema(searchSchema, input);
  return parseCollectionFilters({
    tenantId: params.tenant || null, query: params.q ?? "", status: params.status ?? "all",
    currency: params.currency?.trim().toUpperCase() || null,
    dueFrom: params.from || null, dueUntil: params.until || null,
    page: params.page === undefined ? 1 : Number(params.page), pageSize: 20,
  });
}
export function collectionQuery(filters: CollectionFilters, page = filters.page): string {
  const query = new URLSearchParams();
  if (filters.tenantId) query.set("tenant", filters.tenantId);
  if (filters.query) query.set("q", filters.query);
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.currency) query.set("currency", filters.currency);
  if (filters.dueFrom) query.set("from", filters.dueFrom);
  if (filters.dueUntil) query.set("until", filters.dueUntil);
  if (page !== 1) query.set("page", String(page));
  return query.toString();
}
export function collectionListHref(filters: CollectionFilters, page = filters.page) {
  const query = collectionQuery(filters, page);
  return `/backoffice/collections${query ? `?${query}` : ""}`;
}
export function collectionDetailHref(id: string, filters: CollectionFilters) {
  const query = collectionQuery(filters);
  return `/backoffice/collections/${id}${query ? `?back=${encodeURIComponent(query)}` : ""}`;
}
