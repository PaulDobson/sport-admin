import type { AttendanceStatus } from "./attendance";

export interface AbandonmentPolicy {
  tenantId: string;
  instructorMembershipId: string;
  consecutiveAbsencesThreshold: number;
  attendancePercentageThreshold: number;
  lookbackDays: number;
}

export interface AttendanceObservation {
  status: AttendanceStatus;
  recordedAt: Date;
}

export interface AbandonmentRisk {
  criterion: "consecutive_absences" | "attendance_percentage";
  reason: string;
  periodStart: string;
  periodEnd: string;
}

export interface AbandonmentAlert {
  id: string;
  tenantId: string;
  studentId: string;
  severity: "yellow";
  reason: string;
  operationalAction: string;
  periodStart: string;
  periodEnd: string;
  deduplicationKey: string;
  status: "open" | "resolved";
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function evaluateAbandonmentRisk(
  observations: AttendanceObservation[],
  policy: AbandonmentPolicy,
  evaluatedAt: Date,
): AbandonmentRisk | null {
  const ordered = [...observations].sort(
    (left, right) => right.recordedAt.getTime() - left.recordedAt.getTime(),
  );
  const consecutiveAbsences = ordered.findIndex(
    (observation) => observation.status !== "absent",
  );
  const absenceCount =
    consecutiveAbsences === -1 ? ordered.length : consecutiveAbsences;
  if (absenceCount >= policy.consecutiveAbsencesThreshold) {
    const relevant = ordered.slice(0, absenceCount);
    return {
      criterion: "consecutive_absences",
      reason: `${absenceCount} ausencias consecutivas`,
      periodStart: dateOnly(relevant.at(-1)!.recordedAt),
      periodEnd: dateOnly(relevant[0].recordedAt),
    };
  }

  const periodStart = new Date(evaluatedAt);
  periodStart.setUTCDate(periodStart.getUTCDate() - policy.lookbackDays);
  const eligible = ordered.filter(
    (observation) =>
      observation.recordedAt >= periodStart &&
      observation.recordedAt <= evaluatedAt &&
      observation.status !== "excused",
  );
  if (eligible.length === 0) return null;
  const attended = eligible.filter(
    (observation) =>
      observation.status === "present" || observation.status === "late",
  ).length;
  const percentage = (attended / eligible.length) * 100;
  if (percentage < policy.attendancePercentageThreshold) {
    return {
      criterion: "attendance_percentage",
      reason: `${Math.round(percentage)}% de asistencia en ${policy.lookbackDays} días`,
      periodStart: dateOnly(periodStart),
      periodEnd: dateOnly(evaluatedAt),
    };
  }
  return null;
}
