import { randomUUID } from "node:crypto";
import type {
  AbandonmentAlert,
  AbandonmentPolicy,
  AttendanceObservation,
} from "@/domain/evolution-health-attendance/abandonment";
import type { AbandonmentRepositoryPort } from "../ports/abandonment-repository-port";

export class FakeAbandonmentRepository implements AbandonmentRepositoryPort {
  policies: AbandonmentPolicy[] = [];
  observations: AttendanceObservation[] = [];
  alerts: AbandonmentAlert[] = [];

  async savePolicy(policy: AbandonmentPolicy) {
    this.policies = this.policies.filter(
      (current) =>
        current.tenantId !== policy.tenantId ||
        current.instructorMembershipId !== policy.instructorMembershipId,
    );
    this.policies.push(policy);
    return policy;
  }

  async findPolicy(tenantId: string, instructorMembershipId: string) {
    return (
      this.policies.find(
        (policy) =>
          policy.tenantId === tenantId &&
          policy.instructorMembershipId === instructorMembershipId,
      ) ?? null
    );
  }

  async listAttendance() {
    return this.observations;
  }

  async upsertOpenAlert(input: {
    tenantId: string;
    studentId: string;
    reason: string;
    periodStart: string;
    periodEnd: string;
    deduplicationKey: string;
  }) {
    const existing = this.alerts.find(
      (alert) =>
        alert.deduplicationKey === input.deduplicationKey &&
        alert.status === "open",
    );
    if (existing) return existing;
    const now = new Date();
    const alert: AbandonmentAlert = {
      id: randomUUID(),
      ...input,
      severity: "yellow",
      operationalAction: "Contactar al alumno y revisar continuidad",
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    this.alerts.push(alert);
    return alert;
  }

  async resolveAlert(tenantId: string, alertId: string, resolvedAt: Date) {
    const alert = this.alerts.find(
      (candidate) =>
        candidate.tenantId === tenantId && candidate.id === alertId,
    );
    if (!alert) throw new Error("Alert not found");
    alert.status = "resolved";
    alert.resolvedAt = resolvedAt;
    alert.updatedAt = resolvedAt;
    return alert;
  }

  async listAlertHistory(tenantId: string, studentId: string) {
    return this.alerts.filter(
      (alert) => alert.tenantId === tenantId && alert.studentId === studentId,
    );
  }
}
