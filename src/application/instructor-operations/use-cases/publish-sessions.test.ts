import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import type { SessionPublishingPort } from "../ports/session-publishing-port";
import {
  createOneOffSession,
  publishRecurringSessions,
} from "./publish-sessions";

const tenantId = "83200000-0000-4000-8000-000000000001";
const scheduleId = "83200000-0000-4000-8000-000000000061";

function createPublishing(): SessionPublishingPort {
  return {
    createOneOff: vi.fn().mockResolvedValue({ id: "session-1" }),
    publishSchedule: vi.fn().mockResolvedValue(4),
  } as unknown as SessionPublishingPort;
}

describe("session publishing", () => {
  it("rejects one-off sessions whose end is before the start", async () => {
    const publishing = createPublishing();
    await expect(
      createOneOffSession(
        {
          tenantId,
          classTemplateId: scheduleId,
          locationId: scheduleId,
          instructorMembershipId: scheduleId,
          startsAtLocal: "2026-10-08T19:00",
          endsAtLocal: "2026-10-08T18:00",
          timezone: "America/Santiago",
          waitlistEnabled: true,
        },
        { publishing },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(publishing.createOneOff).not.toHaveBeenCalled();
  });

  it("rejects publication ranges longer than eight weeks", async () => {
    const publishing = createPublishing();
    await expect(
      publishRecurringSessions(
        {
          tenantId,
          classScheduleId: scheduleId,
          fromDate: "2026-10-01",
          throughDate: "2026-11-27",
          waitlistEnabled: true,
        },
        { publishing },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(publishing.publishSchedule).not.toHaveBeenCalled();
  });

  it("publishes a valid bounded range and returns the session count", async () => {
    const publishing = createPublishing();
    await expect(
      publishRecurringSessions(
        {
          tenantId,
          classScheduleId: scheduleId,
          fromDate: "2026-10-01",
          throughDate: "2026-11-26",
          waitlistEnabled: true,
        },
        { publishing },
      ),
    ).resolves.toBe(4);
    expect(publishing.publishSchedule).toHaveBeenCalledOnce();
  });
});
