import type { OwnerBilling } from "@/domain/saas-administration/owner-billing";
export interface OwnerBillingPort { get(tenantId: string,page: number): Promise<OwnerBilling> }
