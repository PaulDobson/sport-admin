import type {
  StudentPortalPort,
  StudentPortalSession,
} from "@/application/student-portal/ports/student-portal-port";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

export class SupabaseStudentPortalRepository implements StudentPortalPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async createInvitation(input: {
    tenantId: string;
    studentId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    const { data, error } = await this.client.rpc(
      "create_student_portal_invitation",
      {
        target_tenant_id: input.tenantId,
        target_student_id: input.studentId,
        target_token_hash: input.tokenHash,
        target_expires_at: input.expiresAt.toISOString(),
      },
    );
    if (error) throw error;
    const row = data[0];
    if (!row) throw new Error("Invitation could not be created");
    return {
      email: row.invited_email,
      tenantName: row.tenant_name,
      expiresAt: new Date(row.expires_at),
    };
  }

  async lookupInvitation(tokenHash: string) {
    const { data, error } = await this.client.rpc(
      "lookup_student_portal_invitation",
      { target_token_hash: tokenHash },
    );
    if (error) throw error;
    const row = data[0];
    return row
      ? {
          email: row.invited_email,
          tenantName: row.tenant_name,
          expiresAt: new Date(row.expires_at),
        }
      : null;
  }

  async hasPendingInvitationForCurrentUser() {
    const { data, error } = await this.client.rpc(
      "has_pending_student_portal_invitation",
    );
    if (error) throw error;
    return data;
  }

  async redeemInvitation(tokenHash: string) {
    const { error } = await this.client.rpc(
      "redeem_student_portal_invitation",
      { target_token_hash: tokenHash },
    );
    if (error) throw error;
  }

  async listMyStudents() {
    const { data, error } = await this.client.rpc(
      "list_my_student_portal_students",
    );
    if (error) throw error;
    return data.map((row) => ({
      id: row.student_id,
      tenantId: row.tenant_id,
      fullName: row.full_name,
      tenantName: row.tenant_name,
    }));
  }

  async listSessions(studentId: string) {
    const { data, error } = await this.client.rpc(
      "list_my_student_portal_sessions",
      { target_student_id: studentId },
    );
    if (error) throw error;
    return data.map((row) => ({
      id: row.session_id,
      tenantId: row.tenant_id,
      studentId: row.student_id,
      className: row.class_name,
      locationName: row.location_name,
      startsAt: new Date(row.starts_at),
      endsAt: new Date(row.ends_at),
      timezone: row.timezone,
      capacity: row.capacity,
      confirmedCount: row.confirmed_count,
      waitlistedCount: row.waitlisted_count,
      enrollmentStatus:
        row.enrollment_status as StudentPortalSession["enrollmentStatus"],
      waitlistEnabled: row.waitlist_enabled,
    }));
  }

  async listAttendanceHistory(studentId: string) {
    const { data, error } = await this.client.rpc(
      "list_my_student_portal_attendance",
      { target_student_id: studentId },
    );
    if (error) throw error;
    return data.map((row) => ({
      sessionId: row.session_id,
      tenantId: row.tenant_id,
      studentId: row.student_id,
      className: row.class_name,
      locationName: row.location_name,
      startsAt: new Date(row.starts_at),
      endsAt: new Date(row.ends_at),
      timezone: row.timezone,
      attendanceStatus: (row.attendance_status ?? null) as
        | "present"
        | "late"
        | "absent"
        | null,
    }));
  }

  async enroll(input: {
    tenantId: string;
    studentId: string;
    sessionId: string;
  }) {
    const { data, error } = await this.client.rpc("enroll_student_in_session", {
      target_tenant_id: input.tenantId,
      target_student_id: input.studentId,
      target_session_id: input.sessionId,
    });
    if (error) throw error;
    return data.status as "confirmed" | "waitlisted";
  }

  async cancelEnrollment(input: {
    tenantId: string;
    studentId: string;
    sessionId: string;
  }) {
    const { error } = await this.client.rpc("cancel_session_enrollment", {
      target_tenant_id: input.tenantId,
      target_student_id: input.studentId,
      target_session_id: input.sessionId,
    });
    if (error) throw error;
  }
}
