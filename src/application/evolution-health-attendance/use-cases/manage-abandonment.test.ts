import { beforeEach, describe, expect, it } from "vitest";
import { FakeAbandonmentRepository } from "../testing/fake-abandonment-repository";
import {
  configureAbandonmentPolicy,
  evaluateStudentAbandonment,
  getAbandonmentAlertHistory,
  resolveAbandonmentAlert,
} from "./manage-abandonment";

const tenantId = "11111111-1111-4111-8111-111111111111";
const instructorMembershipId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";
const evaluatedAt = new Date("2026-08-22T12:00:00Z");
let repository: FakeAbandonmentRepository;

beforeEach(async () => {
  repository = new FakeAbandonmentRepository();
  await configureAbandonmentPolicy(
    {
      tenantId,
      instructorMembershipId,
      consecutiveAbsencesThreshold: 3,
      attendancePercentageThreshold: 50,
      lookbackDays: 30,
    },
    { abandonment: repository },
  );
});

describe("abandonment alerts", () => {
  it("uses suggested thresholds when no custom policy exists", async () => {
    repository.policies = [];
    repository.observations = [20, 18, 16].map((day) => ({
      status: "absent" as const,
      recordedAt: new Date(`2026-08-${day}T12:00:00Z`),
    }));

    const alert = await evaluateStudentAbandonment(
      { tenantId, instructorMembershipId, studentId, evaluatedAt },
      { abandonment: repository },
    );

    expect(alert?.reason).toBe("3 ausencias consecutivas");
  });

  it("deduplicates an alert after three consecutive absences", async () => {
    repository.observations = [20, 18, 16].map((day) => ({
      status: "absent" as const,
      recordedAt: new Date(`2026-08-${day}T12:00:00Z`),
    }));

    const first = await evaluateStudentAbandonment(
      { tenantId, instructorMembershipId, studentId, evaluatedAt },
      { abandonment: repository },
    );
    repository.observations.unshift({
      status: "absent",
      recordedAt: new Date("2026-08-23T12:00:00Z"),
    });
    const repeated = await evaluateStudentAbandonment(
      {
        tenantId,
        instructorMembershipId,
        studentId,
        evaluatedAt: new Date("2026-08-23T12:00:00Z"),
      },
      { abandonment: repository },
    );

    expect(first?.reason).toBe("3 ausencias consecutivas");
    expect(repeated?.id).toBe(first?.id);
    expect(repository.alerts).toHaveLength(1);
  });

  it("creates a percentage alert below the configured threshold", async () => {
    repository.observations = [
      { status: "present", recordedAt: new Date("2026-08-20T12:00:00Z") },
      { status: "absent", recordedAt: new Date("2026-08-18T12:00:00Z") },
      { status: "absent", recordedAt: new Date("2026-08-16T12:00:00Z") },
      { status: "excused", recordedAt: new Date("2026-08-14T12:00:00Z") },
    ];

    const alert = await evaluateStudentAbandonment(
      { tenantId, instructorMembershipId, studentId, evaluatedAt },
      { abandonment: repository },
    );

    expect(alert?.reason).toBe("33% de asistencia en 30 días");
  });

  it("resolves an alert while preserving it in history", async () => {
    repository.observations = [20, 18, 16].map((day) => ({
      status: "absent" as const,
      recordedAt: new Date(`2026-08-${day}T12:00:00Z`),
    }));
    const alert = await evaluateStudentAbandonment(
      { tenantId, instructorMembershipId, studentId, evaluatedAt },
      { abandonment: repository },
    );

    await resolveAbandonmentAlert(
      { tenantId, alertId: alert!.id, resolvedAt: evaluatedAt },
      { abandonment: repository },
    );
    const history = await getAbandonmentAlertHistory(
      { tenantId, studentId },
      { abandonment: repository },
    );

    expect(history).toHaveLength(1);
    expect(history[0].status).toBe("resolved");
    expect(history[0].resolvedAt).toEqual(evaluatedAt);
  });
});
