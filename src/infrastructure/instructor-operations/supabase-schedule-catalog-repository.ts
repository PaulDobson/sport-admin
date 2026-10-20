import type { ScheduleCatalogPort } from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

interface TemplateRow {
  id: string;
  name: string;
  capacity: number;
  disciplines: { name: string };
}

interface ScheduleRow {
  id: string;
  class_template_id: string;
  location_id: string;
  instructor_membership_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  timezone: string;
  class_templates: { name: string };
  locations: { name: string };
}

export class SupabaseScheduleCatalogRepository implements ScheduleCatalogPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async findActiveDiscipline(tenantId: string, id: string) {
    const { data, error } = await this.client
      .from("disciplines")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? { id: data.id } : null;
  }

  async listActiveDisciplines(tenantId: string) {
    const { data, error } = await this.client
      .from("disciplines")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name")
      .order("id");
    if (error) throw error;
    if (!data) throw new Error("Missing discipline catalog");
    return data;
  }

  async listActiveTemplates(tenantId: string) {
    const { data, error } = await this.client
      .from("class_templates")
      .select("id, name, capacity, disciplines!inner(name)")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name");
    if (error) throw error;
    return ((data ?? []) as unknown as TemplateRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      disciplineName: row.disciplines.name,
    }));
  }

  async listActiveSchedules(tenantId: string) {
    const { data, error } = await this.client
      .from("class_schedules")
      .select(
        "id, class_template_id, location_id, instructor_membership_id, day_of_week, starts_at, ends_at, timezone, class_templates!inner(name), locations!inner(name)",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("day_of_week")
      .order("starts_at");
    if (error) throw error;
    return ((data ?? []) as unknown as ScheduleRow[]).map((row) => ({
      id: row.id,
      classTemplateId: row.class_template_id,
      classTemplateName: row.class_templates.name,
      locationId: row.location_id,
      locationName: row.locations.name,
      instructorMembershipId: row.instructor_membership_id,
      dayOfWeek: row.day_of_week,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timezone: row.timezone,
    }));
  }

  async listActiveLocations(tenantId: string) {
    const { data, error } = await this.client
      .from("locations")
      .select("id, name, address")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name");
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, name: row.name, address: row.address }));
  }
}
