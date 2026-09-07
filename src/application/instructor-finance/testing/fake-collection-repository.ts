import type { CollectionAccount } from "@/domain/instructor-finance/collection";
import type { CollectionRepositoryPort } from "../ports/collection-repository-port";

export class FakeCollectionRepository implements CollectionRepositoryPort {
  accounts: Array<CollectionAccount & { tenantId: string }> = [];

  async listAccounts(tenantId: string) {
    return this.accounts.filter((account) => account.tenantId === tenantId);
  }
}
