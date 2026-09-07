import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { SaasFeature } from "@/domain/saas-administration/plan-entitlement";
import type { SaasEntitlementsPort } from "@/application/saas-administration/ports/saas-entitlements-port";

export class SupabaseSaasEntitlements implements SaasEntitlementsPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async canUseFeature(
    tenantId: string,
    feature: SaasFeature,
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc("can_use_saas_feature", {
      target_tenant: tenantId,
      target_feature: feature,
    });
    if (error) throw error;
    return data === true;
  }
}
