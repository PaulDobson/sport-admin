import type { SessionPublishingPort } from "@/application/instructor-operations/ports/session-publishing-port";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

export class SupabaseSessionPublishingRepository implements SessionPublishingPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async createOneOff(
    input: Parameters<SessionPublishingPort["createOneOff"]>[0],
  ) {
    const { data, error } = await this.client.rpc(
      "create_one_off_class_session",
      {
        target_tenant_id: input.tenantId,
        target_class_template_id: input.classTemplateId,
        target_location_id: input.locationId,
        target_instructor_membership_id: input.instructorMembershipId,
        target_starts_at_local: input.startsAtLocal,
        target_ends_at_local: input.endsAtLocal,
        target_timezone: input.timezone,
        target_waitlist_enabled: input.waitlistEnabled,
      },
    );
    if (error) throw error;
    return {
      id: data.id,
      tenantId: data.tenant_id,
      classScheduleId: data.class_schedule_id,
      classTemplateId: data.class_template_id,
      locationId: data.location_id,
      instructorMembershipId: data.instructor_membership_id,
      startsAt: new Date(data.starts_at),
      endsAt: new Date(data.ends_at),
      timezone: data.timezone,
      capacity: data.capacity,
      status: data.status as "scheduled" | "cancelled" | "completed",
      waitlistEnabled: data.waitlist_enabled,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async publishSchedule(
    input: Parameters<SessionPublishingPort["publishSchedule"]>[0],
  ) {
    const { data, error } = await this.client.rpc(
      "publish_recurring_class_sessions",
      {
        target_tenant_id: input.tenantId,
        target_class_schedule_id: input.classScheduleId,
        target_from_date: input.fromDate,
        target_through_date: input.throughDate,
        target_waitlist_enabled: input.waitlistEnabled,
      },
    );
    if (error) throw error;
    return data;
  }
}
