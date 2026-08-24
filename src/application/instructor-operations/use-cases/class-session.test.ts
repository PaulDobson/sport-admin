import { describe, expect, it } from "vitest";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { FakeSessionRepository } from "../testing/fake-session-repository";
import { editClassSession } from "./edit-class-session";
import { generateClassSession } from "./generate-class-session";
import { enrollStudentInSession } from "./manage-session-enrollment";

const tenantId = "10000000-0000-4000-8000-000000000001";
const classScheduleId = "10000000-0000-4000-8000-000000000002";

async function generate(sessions: FakeSessionRepository) {
  return generateClassSession(
    {
      tenantId,
      classScheduleId,
      startsAt: "2026-08-24T13:00:00.000Z",
      endsAt: "2026-08-24T14:00:00.000Z",
      waitlistEnabled: true,
    },
    { sessions },
  );
}

describe("class sessions", () => {
  it("generates a concrete session from its active schedule", async () => {
    const sessions = new FakeSessionRepository();

    await expect(generate(sessions)).resolves.toMatchObject({
      tenantId,
      classScheduleId,
      classTemplateId: sessions.schedule.classTemplateId,
      locationId: sessions.schedule.locationId,
      instructorMembershipId: sessions.schedule.instructorMembershipId,
      timezone: sessions.schedule.timezone,
      capacity: sessions.schedule.capacity,
      status: "scheduled",
    });
  });

  it("edits a concrete session", async () => {
    const sessions = new FakeSessionRepository();
    const session = await generate(sessions);

    await expect(
      editClassSession(
        {
          tenantId,
          sessionId: session.id,
          startsAt: "2026-08-24T14:00:00.000Z",
          endsAt: "2026-08-24T15:30:00.000Z",
          capacity: 4,
          waitlistEnabled: false,
        },
        { sessions },
      ),
    ).resolves.toMatchObject({
      startsAt: new Date("2026-08-24T14:00:00.000Z"),
      endsAt: new Date("2026-08-24T15:30:00.000Z"),
      capacity: 4,
      waitlistEnabled: false,
    });
  });

  it("does not reduce capacity below confirmed enrollments", async () => {
    const sessions = new FakeSessionRepository();
    const session = await generate(sessions);
    for (let index = 0; index < 2; index += 1) {
      const studentId = `10000000-0000-4000-8000-${String(index + 20).padStart(12, "0")}`;
      sessions.students.set(studentId, {
        tenantId,
        fullName: `Student ${index + 1}`,
        active: true,
      });
      await enrollStudentInSession(
        { tenantId, sessionId: session.id, studentId },
        { sessions },
      );
    }

    await expect(
      editClassSession(
        { tenantId, sessionId: session.id, capacity: 1 },
        { sessions },
      ),
    ).rejects.toThrow(BusinessRuleViolationError);
  });
});
