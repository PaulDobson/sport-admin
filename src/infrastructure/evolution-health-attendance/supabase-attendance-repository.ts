import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
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
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async searchStudents(tenantId: string, search: string, page: number) {
    const { data, error } = await this.client.rpc(
      "search_attendance_students",
      {
        target_tenant: tenantId,
        search_text: search,
        page_number: page,
      },
    );
    if (error) throw error;
    return {
      students: (data ?? []).map((row) => ({
        studentId: row.student_id,
        studentName: row.student_name,
      })),
      total: data?.[0]?.total_count ?? 0,
    };
  }

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
        .select("student_id, status, note, students!inner(full_name)")
        .eq("tenant_id", tenantId)
        .eq("session_id", sessionId),
    ]);
    if (enrollments.error) throw enrollments.error;
    if (attendance.error) throw attendance.error;
    const currentByStudent = new Map(
      (attendance.data ?? []).map((row) => [row.student_id as string, row]),
    );
    const expected = (enrollments.data ?? []).map((row) => {
      const student = row.students;
      const current = currentByStudent.get(row.student_id as string);
      return {
        studentId: row.student_id as string,
        studentName: student.full_name,
        currentStatus: current?.status as AttendanceStatus | undefined,
        note: (current?.note as string | null) ?? undefined,
        withoutReservation: false,
      };
    });
    const expectedIds = new Set(expected.map((item) => item.studentId));
    return [
      ...expected,
      ...(attendance.data ?? [])
        .filter((row) => !expectedIds.has(row.student_id as string))
        .map((row) => ({
          studentId: row.student_id as string,
          studentName: row.students.full_name,
          currentStatus: row.status as AttendanceStatus,
          note: (row.note as string | null) ?? undefined,
          withoutReservation: true,
        })),
    ];
  }

  async listStudentHistory(tenantId: string, studentId: string) {
    const { data, error } = await this.client
      .from("class_session_attendance")
      .select(
        "session_id, status, note, recorded_at, class_sessions!inner(starts_at, ends_at, class_templates!inner(name), locations!inner(name))",
      )
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .order("recorded_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return this._mapAttendanceRows(data ?? []);
  }

  async listStudentMonthlySummary(tenantId: string, studentId: string) {
    // One GROUP BY query — returns one row per month, all statuses counted.
    const { data, error } = await this.client.rpc(
      "get_student_attendance_monthly_summary",
      { target_tenant_id: tenantId, target_student_id: studentId },
    );
    if (error) throw error;
    return (data ?? []).map(
      (row: {
        yr: number;
        mo: number;
        present: number;
        late: number;
        absent: number;
        excused: number;
        total: number;
      }) => ({
        year: row.yr,
        month: row.mo,
        present: row.present,
        late: row.late,
        absent: row.absent,
        excused: row.excused,
        total: row.total,
      }),
    );
  }

  async listStudentMonthDetail(
    tenantId: string,
    studentId: string,
    year: number,
    month: number,
  ) {
    const from = new Date(year, month - 1, 1).toISOString();
    const to = new Date(year, month, 1).toISOString(); // exclusive start of next month
    const { data, error } = await this.client
      .from("class_session_attendance")
      .select(
        "session_id, status, note, recorded_at, class_sessions!inner(starts_at, ends_at, class_templates!inner(name), locations!inner(name))",
      )
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .gte("recorded_at", from)
      .lt("recorded_at", to)
      .order("recorded_at", { ascending: false });
    if (error) throw error;
    return this._mapAttendanceRows(data ?? []);
  }

  private _mapAttendanceRows(data: unknown[]) {
    return (data as Array<Record<string, unknown>>).map((row) => {
      const session = row.class_sessions as {
        starts_at: string;
        ends_at: string;
        class_templates: { name: string };
        locations: { name: string };
      };
      return {
        sessionId: (row.session_id as string) ?? "",
        className: session.class_templates.name,
        locationName: session.locations.name,
        startsAt: new Date(session.starts_at),
        endsAt: new Date(session.ends_at),
        status: row.status as AttendanceStatus,
        note: (row.note as string | null) ?? undefined,
        recordedAt: new Date(row.recorded_at as string),
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
