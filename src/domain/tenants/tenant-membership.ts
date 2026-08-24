export type TenantMembershipRole =
  | "owner"
  | "admin"
  | "instructor"
  | "assistant";
export type TenantMembershipStatus =
  | "active"
  | "invited"
  | "suspended"
  | "revoked";

export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantMembershipRole;
  status: TenantMembershipStatus;
  createdAt: Date;
}
