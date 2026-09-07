import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  OperationalReportFilters,
  OperationalReportRepositoryPort,
} from "@/application/reporting/ports/operational-report-repository-port";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

export class SupabaseOperationalReportRepository implements OperationalReportRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async load(tenantId: string, filters: OperationalReportFilters) {
    const from = `${filters.from}T00:00:00.000Z`;
    const to = `${filters.to}T23:59:59.999Z`;
    let attendanceQuery = this.client
      .from("class_session_attendance")
      .select("status,class_sessions!inner(location_id)")
      .eq("tenant_id", tenantId)
      .gte("recorded_at", from)
      .lte("recorded_at", to);
    const alertRelation = filters.locationId
      ? "id,class_sessions!student_alerts_class_session_id_fkey!inner(location_id)"
      : "id";
    let alertQuery = this.client
      .from("student_alerts")
      .select(alertRelation, { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .gte("created_at", from)
      .lte("created_at", to);
    if (filters.locationId) {
      attendanceQuery = attendanceQuery.eq(
        "class_sessions.location_id",
        filters.locationId,
      );
      alertQuery = alertQuery.eq(
        "class_sessions.location_id",
        filters.locationId,
      );
    }

    const [students, attendance, evaluations, alerts] = await Promise.all([
      this.client
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      attendanceQuery,
      this.client
        .from("metric_evaluations")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("evaluated_at", from)
        .lte("evaluated_at", to),
      alertQuery,
    ]);
    for (const result of [students, attendance, evaluations, alerts]) {
      if (result.error) throw result.error;
    }

    const attendanceCounts = {
      total: attendance.data?.length ?? 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    for (const row of (attendance.data ?? []) as {
      status: AttendanceStatus;
    }[]) {
      attendanceCounts[row.status] += 1;
    }

    return {
      ...filters,
      activeStudents: students.count ?? 0,
      attendance: attendanceCounts,
      evaluations: evaluations.count ?? 0,
      openAlerts: alerts.count ?? 0,
    };
  }
}
