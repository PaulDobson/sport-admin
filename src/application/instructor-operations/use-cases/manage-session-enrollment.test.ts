import { describe, expect, it } from "vitest";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { FakeSessionRepository } from "../testing/fake-session-repository";
import { generateClassSession } from "./generate-class-session";
import {
  cancelSessionEnrollment,
  enrollStudentInSession,
} from "./manage-session-enrollment";
import { listExpectedParticipants } from "./list-expected-participants";

const tenantId = "10000000-0000-4000-8000-000000000001";
const classScheduleId = "10000000-0000-4000-8000-000000000002";

async function setup(waitlistEnabled = true) {
  const sessions = new FakeSessionRepository();
  const students = [
    "10000000-0000-4000-8000-000000000020",
    "10000000-0000-4000-8000-000000000021",
    "10000000-0000-4000-8000-000000000022",
  ];
  students.forEach((id, index) =>
    sessions.students.set(id, {
      tenantId,
      fullName: `Student ${index + 1}`,
      active: true,
    }),
  );
  const session = await generateClassSession(
    {
      tenantId,
      classScheduleId,
      startsAt: "2026-08-24T13:00:00.000Z",
      endsAt: "2026-08-24T14:00:00.000Z",
      waitlistEnabled,
    },
    { sessions },
  );
  return { sessions, students, session };
}

describe("session enrollments", () => {
  it("confirms students up to capacity and lists expected participants", async () => {
    const { sessions, students, session } = await setup();
    for (const studentId of students.slice(0, 2)) {
      await enrollStudentInSession(
        { tenantId, sessionId: session.id, studentId },
        { sessions },
      );
    }

    await expect(
      listExpectedParticipants(
        { tenantId, sessionId: session.id },
        { sessions },
      ),
    ).resolves.toHaveLength(2);
  });

  it("waitlists an enrollment beyond capacity when enabled", async () => {
    const { sessions, students, session } = await setup();
    for (const studentId of students) {
      await enrollStudentInSession(
        { tenantId, sessionId: session.id, studentId },
        { sessions },
      );
    }
    expect(sessions.enrollments.at(-1)?.status).toBe("waitlisted");
  });

  it("rejects an enrollment beyond capacity when waitlist is disabled", async () => {
    const { sessions, students, session } = await setup(false);
    for (const studentId of students.slice(0, 2)) {
      await enrollStudentInSession(
        { tenantId, sessionId: session.id, studentId },
        { sessions },
      );
    }
    await expect(
      enrollStudentInSession(
        { tenantId, sessionId: session.id, studentId: students[2] },
        { sessions },
      ),
    ).rejects.toThrow(BusinessRuleViolationError);
  });

  it("removes a cancelled enrollment from expected participants", async () => {
    const { sessions, students, session } = await setup();
    await enrollStudentInSession(
      { tenantId, sessionId: session.id, studentId: students[0] },
      { sessions },
    );
    await cancelSessionEnrollment(
      { tenantId, sessionId: session.id, studentId: students[0] },
      { sessions },
    );
    await expect(
      listExpectedParticipants(
        { tenantId, sessionId: session.id },
        { sessions },
      ),
    ).resolves.toEqual([]);
  });

  it("promotes the first waitlisted student after a confirmed cancellation", async () => {
    const { sessions, students, session } = await setup();
    for (const studentId of students) {
      await enrollStudentInSession(
        { tenantId, sessionId: session.id, studentId },
        { sessions },
      );
    }
    await cancelSessionEnrollment(
      { tenantId, sessionId: session.id, studentId: students[0] },
      { sessions },
    );

    await expect(
      listExpectedParticipants(
        { tenantId, sessionId: session.id },
        { sessions },
      ),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ studentId: students[2] }),
      ]),
    );
  });
});
