import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AbandonmentAlert,
  AbandonmentPolicy,
} from "@/domain/evolution-health-attendance/abandonment";
import type { AttendanceStatus } from "@/domain/evolution-health-attendance/attendance";
import type { AbandonmentRepositoryPort } from "@/application/evolution-health-attendance/ports/abandonment-repository-port";

interface PolicyRow {
  tenant_id: string;
  instructor_membership_id: string;
  consecutive_absences_threshold: number;
  attendance_percentage_threshold: number;
  lookback_days: number;
}

interface AlertRow {
  id: string;
  tenant_id: string;
  student_id: string;
  severity: "yellow";
  reason: string;
  operational_action: string;
  period_start: string;
  period_end: string;
  deduplication_key: string;
  status: "open" | "resolved";
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

function policyFromRow(row: PolicyRow): AbandonmentPolicy {
  return {
    tenantId: row.tenant_id,
    instructorMembershipId: row.instructor_membership_id,
    consecutiveAbsencesThreshold: row.consecutive_absences_threshold,
    attendancePercentageThreshold: Number(row.attendance_percentage_threshold),
    lookbackDays: row.lookback_days,
  };
}

function alertFromRow(row: AlertRow): AbandonmentAlert {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    severity: row.severity,
    reason: row.reason,
    operationalAction: row.operational_action,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    deduplicationKey: row.deduplication_key,
    status: row.status,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseAbandonmentRepository implements AbandonmentRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async savePolicy(policy: AbandonmentPolicy) {
    const { data, error } = await this.client
      .from("abandonment_policies")
      .upsert(
        {
          tenant_id: policy.tenantId,
          instructor_membership_id: policy.instructorMembershipId,
          consecutive_absences_threshold: policy.consecutiveAbsencesThreshold,
          attendance_percentage_threshold: policy.attendancePercentageThreshold,
          lookback_days: policy.lookbackDays,
        },
        { onConflict: "tenant_id,instructor_membership_id" },
      )
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to save abandonment policy");
    return policyFromRow(data as PolicyRow);
  }

  async findPolicy(tenantId: string, instructorMembershipId: string) {
    const { data, error } = await this.client
      .from("abandonment_policies")
      .select()
      .eq("tenant_id", tenantId)
      .eq("instructor_membership_id", instructorMembershipId)
      .maybeSingle();
    if (error) throw error;
    return data ? policyFromRow(data as PolicyRow) : null;
  }

  async listAttendance(input: {
    tenantId: string;
    instructorMembershipId: string;
    studentId: string;
    since: Date;
    until: Date;
  }) {
    const { data, error } = await this.client
      .from("class_session_attendance")
      .select(
        "status, recorded_at, class_sessions!inner(instructor_membership_id)",
      )
      .eq("tenant_id", input.tenantId)
      .eq("student_id", input.studentId)
      .eq(
        "class_sessions.instructor_membership_id",
        input.instructorMembershipId,
      )
      .gte("recorded_at", input.since.toISOString())
      .lte("recorded_at", input.until.toISOString())
      .order("recorded_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      status: row.status as AttendanceStatus,
      recordedAt: new Date(row.recorded_at as string),
    }));
  }

  async upsertOpenAlert(input: {
    tenantId: string;
    studentId: string;
    reason: string;
    periodStart: string;
    periodEnd: string;
    deduplicationKey: string;
  }) {
    const { data, error } = await this.client.rpc("upsert_abandonment_alert", {
      target_tenant: input.tenantId,
      target_student: input.studentId,
      target_reason: input.reason,
      target_period_start: input.periodStart,
      target_period_end: input.periodEnd,
      target_deduplication_key: input.deduplicationKey,
    });
    if (error || !data)
      throw error ?? new Error("Failed to save abandonment alert");
    return alertFromRow(data as AlertRow);
  }

  async resolveAlert(tenantId: string, alertId: string, resolvedAt: Date) {
    const { data, error } = await this.client
      .from("student_alerts")
      .update({ status: "resolved", resolved_at: resolvedAt.toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", alertId)
      .eq("category", "abandonment")
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to resolve abandonment alert");
    return alertFromRow(data as AlertRow);
  }

  async listAlertHistory(tenantId: string, studentId: string) {
    const { data, error } = await this.client
      .from("student_alerts")
      .select()
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .eq("category", "abandonment")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as AlertRow[]).map(alertFromRow);
  }
}
