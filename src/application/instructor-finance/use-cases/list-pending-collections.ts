import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import {
  deriveCollectionItems,
  summarizeCollections,
} from "@/domain/instructor-finance/collection";
import type { CollectionRepositoryPort } from "../ports/collection-repository-port";

const listSchema = z.object({
  tenantId: z.string().uuid(),
  onDate: z.iso.date(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  status: z
    .enum(["active", "paused", "past_due", "expired", "cancelled"])
    .optional(),
});

export async function listPendingCollections(
  input: z.input<typeof listSchema>,
  deps: { collections: CollectionRepositoryPort },
) {
  const parsed = parseWithSchema(listSchema, input);
  const accounts = await deps.collections.listAccounts(parsed.tenantId);
  return deriveCollectionItems(accounts, parsed);
}

export async function getCollectionTotals(
  input: z.input<typeof listSchema>,
  deps: { collections: CollectionRepositoryPort },
) {
  return summarizeCollections(await listPendingCollections(input, deps));
}
