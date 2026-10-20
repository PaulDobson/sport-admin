import { describe, expect, it } from "vitest";
import { sessionParticipation } from "./session-participation";

describe("sessionParticipation", () => {
  it("counts attendees without a confirmed reservation as walk-ins", () => {
    expect(sessionParticipation(
      [
        { status: "confirmed", student_id: "booked" },
        { status: "waitlisted", student_id: "waiting" },
        { status: "cancelled", student_id: "cancelled" },
      ],
      [
        { status: "present", student_id: "booked" },
        { status: "late", student_id: "walk-in" },
        { status: "present", student_id: "waiting" },
        { status: "absent", student_id: "absent" },
        { status: "excused", student_id: "excused" },
      ],
    )).toEqual({ confirmedCount: 1, waitlistedCount: 1, walkInCount: 2, attendedCount: 3 });
  });

  it("treats missing attendance as no walk-ins", () => {
    expect(sessionParticipation([], undefined)).toEqual({
      confirmedCount: 0, waitlistedCount: 0, walkInCount: 0, attendedCount: 0,
    });
  });
});
