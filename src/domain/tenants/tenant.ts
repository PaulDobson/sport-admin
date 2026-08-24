export type TenantStatus =
  | "pending"
  | "trial"
  | "active"
  | "suspended"
  | "cancelled";

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  createdBy: string | null;
  createdAt: Date;
}
