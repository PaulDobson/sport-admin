import type { TenantDetailsPort } from "@/application/tenants/ports/tenant-details-port";
import type { TenantDetails } from "@/domain/tenants/tenant-details";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

export class SupabaseTenantDetails implements TenantDetailsPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async findByTenantId(tenantId: string): Promise<TenantDetails | null> {
    const { data, error } = await (this.client as any).rpc(
      "get_tenant_details",
      {
        target_tenant: tenantId,
      },
    );
    if (error) throw error;
    const row = (data as unknown as Array<Record<string, unknown>> | null)?.[0];
    if (!row) return null;
    return {
      tenantId: row.tenant_id as string,
      name: row.name as string,
      address: (row.address as string | null) ?? null,
      contactName: (row.contact_name as string | null) ?? null,
      contactEmail: (row.contact_email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      region: (row.region as string | null) ?? null,
      logoUrl: (row.logo_url as string | null) ?? null,
    };
  }

  async update(details: TenantDetails): Promise<void> {
    const { error } = await (this.client as any).rpc("update_tenant_details", {
      target_tenant: details.tenantId,
      target_name: details.name,
      target_address: details.address ?? "",
      target_contact_name: details.contactName ?? "",
      target_contact_email: details.contactEmail ?? "",
      target_phone: details.phone ?? "",
      target_city: details.city ?? "",
      target_region: details.region ?? "",
      target_logo_url: details.logoUrl ?? null,
    });
    if (error) throw error;
  }
}
