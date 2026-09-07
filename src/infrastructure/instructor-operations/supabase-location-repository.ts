import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  Location,
  LocationStatus,
  LocationType,
} from "@/domain/instructor-operations/location";
import { NotFoundError } from "@/domain/shared/errors";
import type { LocationRepositoryPort } from "@/application/instructor-operations/ports/location-repository-port";

interface LocationRow {
  id: string;
  tenant_id: string;
  name: string;
  type: LocationType;
  address: string | null;
  status: LocationStatus;
  created_at: string;
}

function toDomain(row: LocationRow): Location {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    type: row.type,
    address: row.address,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseLocationRepository implements LocationRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async create(
    input: Parameters<LocationRepositoryPort["create"]>[0],
  ): Promise<Location> {
    const { data, error } = await this.client
      .from("locations")
      .insert({
        tenant_id: input.tenantId,
        name: input.name,
        type: input.type,
        address: input.address,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to create location");
    return toDomain(data as LocationRow);
  }

  async archive(tenantId: string, locationId: string): Promise<Location> {
    const { data, error } = await this.client
      .from("locations")
      .update({ status: "archived" })
      .eq("tenant_id", tenantId)
      .eq("id", locationId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Location", locationId);
    return toDomain(data as LocationRow);
  }

  async findActiveByTenant(tenantId: string): Promise<Location[]> {
    const { data, error } = await this.client
      .from("locations")
      .select()
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name");
    if (error) throw error;
    return (data as LocationRow[]).map(toDomain);
  }
}
