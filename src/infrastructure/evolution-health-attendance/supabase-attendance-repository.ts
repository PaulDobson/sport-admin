import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceRecord,
  AttendanceStatus,
} from "@/domain/evolution-health-attendance/attendance";
import type { AttendanceRepositoryPort } from "@/application/evolution-health-attendance/ports/attendance-repository-port";

interface AttendanceRow {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  recorded_by_membership_id: string;
  status: AttendanceStatus;
  note: string | null;
  operation_id: string;
  recorded_at: string;
  updated_at: string;
}

function toAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sessionId: row.session_id,
    studentId: row.student_id,
    recordedByMembershipId: row.recorded_by_membership_id,
    status: row.status,
    note: row.note ?? undefined,
    operationId: row.operation_id,
    recordedAt: new Date(row.recorded_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseAttendanceRepository implements AttendanceRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async listExpectedParticipants(tenantId: string, sessionId: string) {
    const [enrollments, attendance] = await Promise.all([
      this.client
        .from("session_enrollments")
        .select("student_id, students!inner(full_name)")
        .eq("tenant_id", tenantId)
        .eq("session_id", sessionId)
        .eq("status", "confirmed")
        .order("created_at"),
      this.client
        .from("class_session_attendance")
        .select("student_id, status, note")
        .eq("tenant_id", tenantId)
        .eq("session_id", sessionId),
    ]);
    if (enrollments.error) throw enrollments.error;
    if (attendance.error) throw attendance.error;
    const currentByStudent = new Map(
      (attendance.data ?? []).map((row) => [row.student_id as string, row]),
    );
    return (enrollments.data ?? []).map((row) => {
      const student = row.students as unknown as { full_name: string };
      const current = currentByStudent.get(row.student_id as string);
      return {
        studentId: row.student_id as string,
        studentName: student.full_name,
        currentStatus: current?.status as AttendanceStatus | undefined,
        note: (current?.note as string | null) ?? undefined,
      };
    });
  }

  async saveBatch(input: Parameters<AttendanceRepositoryPort["saveBatch"]>[0]) {
    const { data, error } = await this.client
      .from("class_session_attendance")
      .upsert(
        input.items.map((item) => ({
          tenant_id: input.tenantId,
          session_id: input.sessionId,
          student_id: item.studentId,
          recorded_by_membership_id: input.recordedByMembershipId,
          status: item.status,
          note: item.note,
          operation_id: item.operationId,
        })),
        { onConflict: "tenant_id,session_id,student_id" },
      )
      .select();
    if (error) throw error;
    return (data as AttendanceRow[]).map(toAttendance);
  }
}
