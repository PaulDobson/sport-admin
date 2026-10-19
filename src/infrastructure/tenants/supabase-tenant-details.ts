import type { TenantDetailsPort } from "@/application/tenants/ports/tenant-details-port";
import type { TenantDetails } from "@/domain/tenants/tenant-details";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

export class SupabaseTenantDetails implements TenantDetailsPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async findByTenantId(tenantId: string): Promise<TenantDetails | null> {
    const { data, error } = await this.client.rpc("get_tenant_details", { target_tenant: tenantId });
    if (error) throw error;
    const row = data?.[0];
    return row ? {
      tenantId: row.tenant_id,
      name: row.name,
      address: row.address,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      phone: row.phone,
      city: row.city,
      region: row.region,
    } : null;
  }

  async update(details: TenantDetails): Promise<void> {
    const { error } = await this.client.rpc("update_tenant_details", {
      target_tenant: details.tenantId,
      target_name: details.name,
      target_address: details.address ?? "",
      target_contact_name: details.contactName ?? "",
      target_contact_email: details.contactEmail ?? "",
      target_phone: details.phone ?? "",
      target_city: details.city ?? "",
      target_region: details.region ?? "",
    });
    if (error) throw error;
  }
}
