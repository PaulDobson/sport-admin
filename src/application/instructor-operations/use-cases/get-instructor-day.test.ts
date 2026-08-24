import { describe, expect, it } from "vitest";
import type { InstructorDayRepositoryPort } from "../ports/instructor-day-repository-port";
import { getInstructorDay } from "./get-instructor-day";

const tenantId = "10000000-0000-4000-8000-000000000001";
const locationId = "10000000-0000-4000-8000-000000000002";

function createRepository(): InstructorDayRepositoryPort {
  return {
    async countActiveStudents() {
      return 12;
    },
    async listActiveLocations() {
      return [{ id: locationId, name: "Central Park" }];
    },
    async listOpenSessions(input) {
      expect(input.locationId).toBe(locationId);
      return [
        {
          id: "upcoming",
          name: "Evening class",
          locationId,
          locationName: "Central Park",
          startsAt: new Date("2026-08-22T15:00:00Z"),
          endsAt: new Date("2026-08-22T16:00:00Z"),
          capacity: 8,
          confirmedCount: 3,
          waitlistedCount: 2,
        },
        {
          id: "current",
          name: "Current class",
          locationId,
          locationName: "Central Park",
          startsAt: new Date("2026-08-22T13:00:00Z"),
          endsAt: new Date("2026-08-22T14:00:00Z"),
          capacity: 10,
          confirmedCount: 7,
          waitlistedCount: 1,
        },
      ];
    },
  };
}

describe("getInstructorDay", () => {
  it("prioritizes the current session and summarizes pending enrollments", async () => {
    const result = await getInstructorDay(
      {
        tenantId,
        locationId,
        now: "2026-08-22T13:30:00Z",
      },
      { instructorDay: createRepository() },
    );

    expect(result.currentSession?.id).toBe("current");
    expect(result.upcomingSessions.map((session) => session.id)).toEqual([
      "upcoming",
    ]);
    expect(result.pendingEnrollments).toBe(3);
    expect(result.activeStudents).toBe(12);
  });
});
