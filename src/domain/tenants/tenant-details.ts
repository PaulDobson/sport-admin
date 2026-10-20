import type { TenantMembershipRole } from "./tenant-membership";

export interface TenantDetails {
  tenantId: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
}

export function canManageTenantDetails(role: TenantMembershipRole): boolean {
  return role === "owner" || role === "admin";
}
