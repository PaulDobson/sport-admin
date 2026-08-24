import type {
  TenantMembership,
  TenantMembershipRole,
} from "@/domain/tenants/tenant-membership";

/** Port for creating and reading tenant memberships. Infrastructure implements this against Supabase/Postgres. */
export interface TenantMembershipRepositoryPort {
  create(input: {
    tenantId: string;
    userId: string;
    role: TenantMembershipRole;
  }): Promise<TenantMembership>;
  findActiveByUser(userId: string): Promise<TenantMembership[]>;
  findOperationalByUser(userId: string): Promise<TenantMembership[]>;
}
