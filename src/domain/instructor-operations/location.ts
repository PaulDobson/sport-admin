export type LocationType = "external_gym" | "park" | "home" | "online";
export type LocationStatus = "active" | "archived";

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  type: LocationType;
  address: string | null;
  status: LocationStatus;
  createdAt: Date;
}
