import type { BillingIssuer, SaveBillingIssuerInput } from "@/domain/saas-administration/billing-issuer";

export interface BillingIssuerPort {
  isPlatformAdmin(): Promise<boolean>;
  get(): Promise<BillingIssuer | null>;
  save(input: SaveBillingIssuerInput): Promise<BillingIssuer>;
}
