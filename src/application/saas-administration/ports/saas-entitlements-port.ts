import type { SaasFeature } from "@/domain/saas-administration/plan-entitlement";

export interface SaasEntitlementsPort {
  canUseFeature(tenantId: string, feature: SaasFeature): Promise<boolean>;
}
