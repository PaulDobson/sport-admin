import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { Database } from "@/infrastructure/supabase/database.types";
import { NotFoundError } from "@/domain/shared/errors";
import type {
  ClassSession,
  ClassSessionStatus,
  SessionEnrollment,
  SessionEnrollmentStatus,
} from "@/domain/instructor-operations/session";
import type {
  EditSessionInput,
  GenerateSessionInput,
  SessionRepositoryPort,
} from "@/application/instructor-operations/ports/session-repository-port";

type ClassSessionUpdate =
  Database["public"]["Tables"]["class_sessions"]["Update"];

interface SessionRow {
  id: string;
  tenant_id: string;
  class_schedule_id: string;
  class_template_id: string;
  location_id: string;
  instructor_membership_id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number;
  waitlist_enabled: boolean;
  status: ClassSessionStatus;
  created_at: string;
  updated_at: string;
}

interface EnrollmentRow {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  status: SessionEnrollmentStatus;
  created_at: string;
  updated_at: string;
}

export class SupabaseSessionRepository implements SessionRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async generate(input: GenerateSessionInput) {
    const { data, error } = await this.client.rpc("generate_class_session", {
      target_tenant_id: input.tenantId,
      target_schedule_id: input.classScheduleId,
      target_starts_at: input.startsAt.toISOString(),
      target_ends_at: input.endsAt.toISOString(),
      target_waitlist_enabled: input.waitlistEnabled,
    });
    if (error) throw error;
    return toSession(data as SessionRow);
  }

  async update(input: EditSessionInput) {
    const values: ClassSessionUpdate = {};
    if (input.locationId !== undefined) values.location_id = input.locationId;
    if (input.instructorMembershipId !== undefined) {
      values.instructor_membership_id = input.instructorMembershipId;
    }
    if (input.startsAt !== undefined)
      values.starts_at = input.startsAt.toISOString();
    if (input.endsAt !== undefined) values.ends_at = input.endsAt.toISOString();
    if (input.capacity !== undefined) values.capacity = input.capacity;
    if (input.waitlistEnabled !== undefined) {
      values.waitlist_enabled = input.waitlistEnabled;
    }
    if (input.status !== undefined) values.status = input.status;
    const { data, error } = await this.client
      .from("class_sessions")
      .update(values)
      .eq("tenant_id", input.tenantId)
      .eq("id", input.sessionId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Class session", input.sessionId);
    return toSession(data as SessionRow);
  }

  async enroll(input: {
    tenantId: string;
    sessionId: string;
    studentId: string;
  }) {
    const { data, error } = await this.client.rpc("enroll_student_in_session", {
      target_tenant_id: input.tenantId,
      target_session_id: input.sessionId,
      target_student_id: input.studentId,
    });
    if (error) throw error;
    return toEnrollment(data as EnrollmentRow);
  }

  async cancelEnrollment(input: {
    tenantId: string;
    sessionId: string;
    studentId: string;
  }) {
    const { data, error } = await this.client.rpc("cancel_session_enrollment", {
      target_tenant_id: input.tenantId,
      target_session_id: input.sessionId,
      target_student_id: input.studentId,
    });
    if (error) throw error;
    return toEnrollment(data as EnrollmentRow);
  }

  async listExpectedParticipants(tenantId: string, sessionId: string) {
    const { data, error } = await this.client
      .from("session_enrollments")
      .select("id, student_id, students!inner(full_name)")
      .eq("tenant_id", tenantId)
      .eq("session_id", sessionId)
      .eq("status", "confirmed")
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((row) => {
      const student = row.students as unknown as { full_name: string };
      return {
        enrollmentId: row.id as string,
        studentId: row.student_id as string,
        fullName: student.full_name,
      };
    });
  }
}

function toSession(row: SessionRow): ClassSession {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    classScheduleId: row.class_schedule_id,
    classTemplateId: row.class_template_id,
    locationId: row.location_id,
    instructorMembershipId: row.instructor_membership_id,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    timezone: row.timezone,
    capacity: row.capacity,
    waitlistEnabled: row.waitlist_enabled,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toEnrollment(row: EnrollmentRow): SessionEnrollment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sessionId: row.session_id,
    studentId: row.student_id,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
