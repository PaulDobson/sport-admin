import type {
  Location,
  LocationType,
} from "@/domain/instructor-operations/location";

export interface LocationRepositoryPort {
  create(input: {
    tenantId: string;
    name: string;
    type: LocationType;
    address: string | null;
  }): Promise<Location>;
  archive(tenantId: string, locationId: string): Promise<Location>;
  findActiveByTenant(tenantId: string): Promise<Location[]>;
}
