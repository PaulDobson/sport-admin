import type { ScheduleSessionRepositoryPort } from "@/application/instructor-operations/ports/schedule-session-repository-port";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { ClassSessionStatus } from "@/domain/instructor-operations/session";
import { sessionParticipation } from "./session-participation";

interface SessionRow {
  id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: ClassSessionStatus;
  class_templates: { name: string };
  locations: { name: string };
  session_enrollments: Array<{ status: string; student_id: string }>;
  class_session_attendance?: Array<{ status: string; student_id: string }>;
}

export class SupabaseScheduleSessionRepository
  implements ScheduleSessionRepositoryPort
{
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async findById(tenantId: string, sessionId: string) {
    const { data, error } = await this.client
      .from("class_sessions")
      .select("id, starts_at, ends_at, class_templates!inner(name), locations!inner(name)")
      .eq("tenant_id", tenantId)
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      name: data.class_templates.name,
      locationName: data.locations.name,
      startsAt: new Date(data.starts_at),
      endsAt: new Date(data.ends_at),
    };
  }

  async listPage(input: Parameters<ScheduleSessionRepositoryPort["listPage"]>[0]) {
    const locationsPromise = this.client
      .from("locations")
      .select("id, name")
      .eq("tenant_id", input.tenantId)
      .eq("status", "active")
      .order("name");
    const disciplinesPromise = this.client
      .from("disciplines")
      .select("id, name")
      .eq("tenant_id", input.tenantId)
      .order("name");

    let query = this.client
      .from("class_sessions")
      .select(
        "id, location_id, starts_at, ends_at, capacity, status, class_templates!inner(name, discipline_id), locations!inner(name), session_enrollments(status, student_id), class_session_attendance(status, student_id)",
        { count: "exact" },
      )
      .eq("tenant_id", input.tenantId)
      .order("starts_at")
      .order("id")
      .range(
        (input.page - 1) * input.pageSize,
        input.page * input.pageSize - 1,
      );
    if (input.status !== "all") query = query.eq("status", input.status);
    if (input.locationId) query = query.eq("location_id", input.locationId);
    if (input.disciplineId) {
      query = query.eq("class_templates.discipline_id", input.disciplineId);
    }
    if (input.query) query = query.ilike("class_templates.name", `%${input.query}%`);
    if (input.startsOnOrAfter) {
      query = query.gte("starts_at", input.startsOnOrAfter.toISOString());
    }
    if (input.startsBefore) {
      query = query.lt("starts_at", input.startsBefore.toISOString());
    }

    const [locationResult, sessionResult, disciplineResult] = await Promise.all([
      locationsPromise,
      query,
      disciplinesPromise,
    ]);
    if (locationResult.error) throw locationResult.error;
    if (sessionResult.error) throw sessionResult.error;
    if (disciplineResult.error) throw disciplineResult.error;

    return {
      disciplines: disciplineResult.data ?? [],
      locations: (locationResult.data ?? []).map((location) => ({
        id: location.id,
        name: location.name,
      })),
      sessions: ((sessionResult.data ?? []) as unknown as SessionRow[]).map(
        (row) => ({
          id: row.id,
          name: row.class_templates.name,
          locationId: row.location_id,
          locationName: row.locations.name,
          startsAt: new Date(row.starts_at),
          endsAt: new Date(row.ends_at),
          capacity: row.capacity,
          ...sessionParticipation(row.session_enrollments, row.class_session_attendance),
          status: row.status,
        }),
      ),
      total: sessionResult.count ?? 0,
    };
  }
}
