import { describe, expect, it } from "vitest";
import { FakeAttendanceRepository } from "../testing/fake-attendance-repository";
import { getAttendanceRoster } from "./get-attendance-roster";
import { saveAttendanceBatch } from "./save-attendance-batch";

const tenantId = "60000000-0000-4000-8000-000000000001";
const sessionId = "60000000-0000-4000-8000-000000000002";
const recordedByMembershipId = "60000000-0000-4000-8000-000000000003";

describe("bulk attendance", () => {
  it("records five students through one roster load and one batch save", async () => {
    const attendance = new FakeAttendanceRepository();
    attendance.participants.push(
      ...Array.from({ length: 5 }, (_, index) => ({
        tenantId,
        sessionId,
        studentId: `60000000-0000-4000-8000-${String(index + 11).padStart(12, "0")}`,
        studentName: `Student ${index + 1}`,
      })),
    );

    const roster = await getAttendanceRoster(
      { tenantId, sessionId },
      { attendance },
    );
    const records = await saveAttendanceBatch(
      {
        tenantId,
        sessionId,
        recordedByMembershipId,
        items: roster.map((participant, index) => ({
          studentId: participant.studentId,
          status: index === 2 ? "late" : "present",
          note: index === 2 ? "Traffic delay" : undefined,
          operationId: `61000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        })),
      },
      { attendance },
    );

    expect(records).toHaveLength(5);
    expect(attendance.saveCalls).toBe(1);
    expect(records.filter((record) => record.status === "late")).toEqual([
      expect.objectContaining({ note: "Traffic delay" }),
    ]);
  });
});
