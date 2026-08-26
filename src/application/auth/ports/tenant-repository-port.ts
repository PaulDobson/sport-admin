import type { Tenant } from "@/domain/tenants/tenant";

/** Port for creating and reading tenants. Infrastructure implements this against Supabase/Postgres. */
export interface TenantRepositoryPort {
  create(input: { name: string; createdBy: string }): Promise<Tenant>;
  findById(id: string): Promise<Tenant | null>;
  findOperationalByUser(userId: string): Promise<Tenant[]>;
}
