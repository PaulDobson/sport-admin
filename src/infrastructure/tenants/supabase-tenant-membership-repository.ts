import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TenantMembership,
  TenantMembershipRole,
  TenantMembershipStatus,
} from "@/domain/tenants/tenant-membership";
import type { TenantMembershipRepositoryPort } from "@/application/auth/ports/tenant-membership-repository-port";
import { throwMappedSaasLimitError } from "@/infrastructure/saas-administration/map-saas-limit-error";

interface TenantMembershipRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantMembershipRole;
  status: TenantMembershipStatus;
  created_at: string;
}

function toDomain(row: TenantMembershipRow): TenantMembership {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseTenantMembershipRepository implements TenantMembershipRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    tenantId: string;
    userId: string;
    role: TenantMembershipRole;
  }): Promise<TenantMembership> {
    const { data, error } = await this.client
      .from("tenant_memberships")
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        role: input.role,
      })
      .select()
      .single();
    if (error) throwMappedSaasLimitError(error);
    if (!data) throw new Error("Failed to create tenant membership");
    return toDomain(data as TenantMembershipRow);
  }

  async findActiveByUser(userId: string): Promise<TenantMembership[]> {
    const { data, error } = await this.client
      .from("tenant_memberships")
      .select()
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw error;
    return (data as TenantMembershipRow[]).map(toDomain);
  }

  async findOperationalByUser(userId: string): Promise<TenantMembership[]> {
    const { data, error } = await this.client
      .from("tenant_memberships")
      .select("*, tenants!inner(status)")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("tenants.status", ["trial", "active"]);
    if (error) throw error;
    return (data as TenantMembershipRow[]).map(toDomain);
  }
}
