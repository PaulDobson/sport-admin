import { describe, expect, it } from "vitest";
import { FakeHealthRepository } from "../testing/fake-health-repository";
import {
  createHealthCondition,
  createHealthRestriction,
  createInjury,
  getStudentHealthHistory,
  resolveHealthRestriction,
  resolveInjury,
  updateHealthCondition,
  updateInjury,
} from "./manage-student-health";

const ids = {
  tenantId: "30000000-0000-4000-8000-000000000001",
  studentId: "30000000-0000-4000-8000-000000000002",
};

describe("student health history", () => {
  it("preserves active and resolved records with access and change audits", async () => {
    const health = new FakeHealthRepository();
    const condition = await createHealthCondition(
      {
        ...ids,
        name: "Asthma",
        source: "self_reported",
        startedOn: "2020-01-01",
      },
      { health },
    );
    await updateHealthCondition(
      {
        tenantId: ids.tenantId,
        recordId: condition.id,
        notes: "Bring inhaler",
      },
      { health },
    );
    const injury = await createInjury(
      {
        ...ids,
        name: "Ankle sprain",
        painLevel: 6,
        source: "self_reported",
        occurredOn: "2026-08-20",
      },
      { health },
    );
    await updateInjury(
      {
        tenantId: ids.tenantId,
        recordId: injury.id,
        painLevel: 3,
        notes: "Improving",
      },
      { health },
    );
    const restriction = await createHealthRestriction(
      {
        ...ids,
        injuryId: injury.id,
        description: "Avoid impact",
        operationalAction: "Use low-impact alternatives",
        severity: "yellow",
        source: "instructor_review",
        startsOn: "2026-08-20",
      },
      { health },
    );
    await resolveInjury(
      {
        tenantId: ids.tenantId,
        recordId: injury.id,
        resolvedAt: "2026-08-30T10:00:00Z",
      },
      { health },
    );
    await resolveHealthRestriction(
      {
        tenantId: ids.tenantId,
        recordId: restriction.id,
        resolvedAt: "2026-08-30T10:00:00Z",
      },
      { health },
    );

    const history = await getStudentHealthHistory(ids, { health });

    expect(history.conditions).toEqual([
      expect.objectContaining({
        id: condition.id,
        status: "active",
        notes: "Bring inhaler",
      }),
    ]);
    expect(history.injuries).toEqual([
      expect.objectContaining({
        id: injury.id,
        status: "resolved",
        painLevel: 3,
      }),
    ]);
    expect(history.restrictions).toEqual([
      expect.objectContaining({ id: restriction.id, status: "resolved" }),
    ]);
    expect(health.auditEvents).toHaveLength(8);
    expect(health.auditEvents.at(-1)).toMatchObject({
      action: "read",
      entityType: "student_health_history",
    });
  });
});
