import type { SupabaseClient } from "@supabase/supabase-js";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import type { InstructorDayRepositoryPort } from "@/application/instructor-operations/ports/instructor-day-repository-port";

interface SessionRow {
  id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  class_templates: { name: string };
  locations: { name: string };
  session_enrollments: Array<{ status: string }>;
}

export class SupabaseInstructorDayRepository implements InstructorDayRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async countActiveStudents(tenantId: string): Promise<number> {
    const { count, error } = await this.client
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active");
    if (error) throw error;
    return count ?? 0;
  }

  async listActiveLocations(tenantId: string) {
    const { data, error } = await this.client
      .from("locations")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name");
    if (error) throw error;
    return (data ?? []).map((location) => ({
      id: location.id as string,
      name: location.name as string,
    }));
  }

  async listOpenSessions(input: {
    tenantId: string;
    now: Date;
    locationId?: string;
  }): Promise<DaySession[]> {
    let query = this.client
      .from("class_sessions")
      .select(
        "id, location_id, starts_at, ends_at, capacity, class_templates!inner(name), locations!inner(name), session_enrollments(status)",
      )
      .eq("tenant_id", input.tenantId)
      .eq("status", "scheduled")
      .gte("ends_at", input.now.toISOString())
      .order("starts_at")
      .limit(20);
    if (input.locationId) query = query.eq("location_id", input.locationId);

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as SessionRow[]).map((row) => ({
      id: row.id,
      name: row.class_templates.name,
      locationId: row.location_id,
      locationName: row.locations.name,
      startsAt: new Date(row.starts_at),
      endsAt: new Date(row.ends_at),
      capacity: row.capacity,
      confirmedCount: row.session_enrollments.filter(
        (enrollment) => enrollment.status === "confirmed",
      ).length,
      waitlistedCount: row.session_enrollments.filter(
        (enrollment) => enrollment.status === "waitlisted",
      ).length,
    }));
  }
}
