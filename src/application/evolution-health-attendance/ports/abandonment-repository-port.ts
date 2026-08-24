import type {
  AbandonmentAlert,
  AbandonmentPolicy,
  AttendanceObservation,
} from "@/domain/evolution-health-attendance/abandonment";

export interface AbandonmentRepositoryPort {
  savePolicy(policy: AbandonmentPolicy): Promise<AbandonmentPolicy>;
  findPolicy(
    tenantId: string,
    instructorMembershipId: string,
  ): Promise<AbandonmentPolicy | null>;
  listAttendance(input: {
    tenantId: string;
    instructorMembershipId: string;
    studentId: string;
    since: Date;
    until: Date;
  }): Promise<AttendanceObservation[]>;
  upsertOpenAlert(input: {
    tenantId: string;
    studentId: string;
    reason: string;
    periodStart: string;
    periodEnd: string;
    deduplicationKey: string;
  }): Promise<AbandonmentAlert>;
  resolveAlert(
    tenantId: string,
    alertId: string,
    resolvedAt: Date,
  ): Promise<AbandonmentAlert>;
  listAlertHistory(
    tenantId: string,
    studentId: string,
  ): Promise<AbandonmentAlert[]>;
}
