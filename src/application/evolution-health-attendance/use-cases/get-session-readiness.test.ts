import { describe, expect, it } from "vitest";
import { FakeHealthRepository } from "../testing/fake-health-repository";
import { createHealthRestriction } from "./manage-student-health";
import { getSessionReadiness } from "./get-session-readiness";

const tenantId = "50000000-0000-4000-8000-000000000001";
const sessionId = "50000000-0000-4000-8000-000000000002";
const students = [
  ["50000000-0000-4000-8000-000000000011", "Red Student"],
  ["50000000-0000-4000-8000-000000000012", "Yellow Student"],
  ["50000000-0000-4000-8000-000000000013", "Green Student"],
  ["50000000-0000-4000-8000-000000000014", "No Record Student"],
] as const;

describe("getSessionReadiness", () => {
  it("returns red, yellow, green, and non-diagnostic empty states", async () => {
    const health = new FakeHealthRepository();
    health.sessionParticipants.push(
      ...students.map(([studentId, studentName]) => ({
        tenantId,
        sessionId,
        studentId,
        studentName,
      })),
    );
    for (const [index, severity] of (
      ["red", "yellow", "green"] as const
    ).entries()) {
      await createHealthRestriction(
        {
          tenantId,
          studentId: students[index][0],
          description: `${severity} reason`,
          operationalAction: `${severity} action`,
          severity,
          source: "instructor_review",
          startsOn: "2026-08-01",
        },
        { health },
      );
    }

    const readiness = await getSessionReadiness(
      {
        tenantId,
        sessionId,
        onDate: "2026-08-22",
        checkedAt: "2026-08-22T10:00:00Z",
      },
      { health },
    );

    expect(readiness.map((item) => item.level)).toEqual([
      "red",
      "yellow",
      "green",
      "green",
    ]);
    expect(readiness[0]).toMatchObject({
      reason: "red reason",
      operationalAction: "red action",
    });
    expect(Object.keys(readiness[0]).sort()).toEqual([
      "checkedAt",
      "level",
      "operationalAction",
      "reason",
      "restrictionId",
      "studentId",
      "studentName",
    ]);
    expect(readiness[0]).not.toHaveProperty("source");
    expect(readiness[0]).not.toHaveProperty("notes");
    expect(readiness[0]).not.toHaveProperty("conditionId");
    expect(readiness[0]).not.toHaveProperty("injuryId");
    expect(readiness[3]).toMatchObject({
      reason: "Sin alertas de salud registradas",
      operationalAction: "Confirmar el estado actual con el alumno",
      restrictionId: undefined,
    });
    expect(
      health.auditEvents.filter((event) => event.action === "read"),
    ).toHaveLength(4);
  });
});
