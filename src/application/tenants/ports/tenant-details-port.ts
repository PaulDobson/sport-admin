import type { TenantDetails } from "@/domain/tenants/tenant-details";

export interface TenantDetailsPort {
  findByTenantId(tenantId: string): Promise<TenantDetails | null>;
  update(details: TenantDetails): Promise<void>;
}
