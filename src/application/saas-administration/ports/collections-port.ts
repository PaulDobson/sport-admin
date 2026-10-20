import type { CollectionDetail, CollectionFilters, CollectionsPage } from "@/domain/saas-administration/collections";

export interface CollectionsPort {
  isPlatformAdmin(): Promise<boolean>;
  list(filters: CollectionFilters): Promise<CollectionsPage>;
  get(invoiceId: string): Promise<CollectionDetail>;
}
