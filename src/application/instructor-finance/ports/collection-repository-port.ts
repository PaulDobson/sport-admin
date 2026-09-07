import type { CollectionAccount } from "@/domain/instructor-finance/collection";

export interface CollectionRepositoryPort {
  listAccounts(tenantId: string): Promise<CollectionAccount[]>;
}
