import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tenant, TenantStatus } from "@/domain/tenants/tenant";
import type { TenantRepositoryPort } from "@/application/auth/ports/tenant-repository-port";

interface TenantRow {
  id: string;
  name: string;
  status: TenantStatus;
  created_by: string | null;
  created_at: string;
}

function toDomain(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseTenantRepository implements TenantRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: { name: string; createdBy: string }): Promise<Tenant> {
    const { data, error } = await this.client
      .from("tenants")
      .insert({ name: input.name, created_by: input.createdBy })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to create tenant");
    return toDomain(data as TenantRow);
  }

  async findById(id: string): Promise<Tenant | null> {
    const { data, error } = await this.client
      .from("tenants")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data as TenantRow) : null;
  }
}
