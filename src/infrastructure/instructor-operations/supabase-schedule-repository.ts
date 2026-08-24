import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClassSchedule,
  ClassTemplate,
  Discipline,
  OperationalStatus,
} from "@/domain/instructor-operations/schedule";
import type {
  CreateScheduleInput,
  ScheduleRepositoryPort,
} from "@/application/instructor-operations/ports/schedule-repository-port";

interface BaseRow {
  id: string;
  tenant_id: string;
  status: OperationalStatus;
  created_at: string;
}

interface DisciplineRow extends BaseRow {
  name: string;
}

interface ClassTemplateRow extends BaseRow {
  discipline_id: string;
  name: string;
  capacity: number;
}

interface ClassScheduleRow extends BaseRow {
  class_template_id: string;
  location_id: string;
  instructor_membership_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  timezone: string;
  allow_conflict: boolean;
}

export class SupabaseScheduleRepository implements ScheduleRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async createDiscipline(input: { tenantId: string; name: string }) {
    const { data, error } = await this.client
      .from("disciplines")
      .insert({ tenant_id: input.tenantId, name: input.name })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to create discipline");
    const row = data as DisciplineRow;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      status: row.status,
      createdAt: new Date(row.created_at),
    } satisfies Discipline;
  }

  async createClassTemplate(
    input: Parameters<ScheduleRepositoryPort["createClassTemplate"]>[0],
  ) {
    const { data, error } = await this.client
      .from("class_templates")
      .insert({
        tenant_id: input.tenantId,
        discipline_id: input.disciplineId,
        name: input.name,
        capacity: input.capacity,
      })
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to create class template");
    const row = data as ClassTemplateRow;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      disciplineId: row.discipline_id,
      name: row.name,
      capacity: row.capacity,
      status: row.status,
      createdAt: new Date(row.created_at),
    } satisfies ClassTemplate;
  }

  async hasConflict(input: CreateScheduleInput): Promise<boolean> {
    const { count, error } = await this.client
      .from("class_schedules")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", input.tenantId)
      .eq("instructor_membership_id", input.instructorMembershipId)
      .eq("day_of_week", input.dayOfWeek)
      .eq("status", "active")
      .lt("starts_at", input.endsAt)
      .gt("ends_at", input.startsAt);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async createSchedule(input: CreateScheduleInput) {
    const { data, error } = await this.client
      .from("class_schedules")
      .insert({
        tenant_id: input.tenantId,
        class_template_id: input.classTemplateId,
        location_id: input.locationId,
        instructor_membership_id: input.instructorMembershipId,
        day_of_week: input.dayOfWeek,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        timezone: input.timezone,
        allow_conflict: input.allowConflict,
      })
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to create class schedule");
    const row = data as ClassScheduleRow;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      classTemplateId: row.class_template_id,
      locationId: row.location_id,
      instructorMembershipId: row.instructor_membership_id,
      dayOfWeek: row.day_of_week,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timezone: row.timezone,
      allowConflict: row.allow_conflict,
      status: row.status,
      createdAt: new Date(row.created_at),
    } satisfies ClassSchedule;
  }
}
