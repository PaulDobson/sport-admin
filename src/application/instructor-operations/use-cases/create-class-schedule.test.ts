import { describe, expect, it } from "vitest";
import {
  BusinessRuleViolationError,
  ValidationError,
} from "@/domain/shared/errors";
import { FakeScheduleRepository } from "../testing/fake-schedule-repository";
import { createClassSchedule } from "./create-class-schedule";

const baseInput = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  classTemplateId: "10000000-0000-4000-8000-000000000002",
  locationId: "10000000-0000-4000-8000-000000000003",
  instructorMembershipId: "10000000-0000-4000-8000-000000000004",
  dayOfWeek: 1,
  startsAt: "10:00",
  endsAt: "11:00",
  timezone: "America/Argentina/Buenos_Aires",
};

describe("createClassSchedule", () => {
  it("rejects an overlapping instructor schedule", async () => {
    const schedules = new FakeScheduleRepository();
    await createClassSchedule(baseInput, { schedules });

    await expect(
      createClassSchedule(
        { ...baseInput, startsAt: "10:30", endsAt: "11:30" },
        { schedules },
      ),
    ).rejects.toThrow(BusinessRuleViolationError);
  });

  it("allows an explicitly confirmed conflict", async () => {
    const schedules = new FakeScheduleRepository();
    await createClassSchedule(baseInput, { schedules });

    await expect(
      createClassSchedule(
        {
          ...baseInput,
          startsAt: "10:30",
          endsAt: "11:30",
          allowConflict: true,
        },
        { schedules },
      ),
    ).resolves.toMatchObject({ allowConflict: true });
  });

  it("rejects an unknown timezone", async () => {
    const schedules = new FakeScheduleRepository();

    await expect(
      createClassSchedule(
        { ...baseInput, timezone: "Mars/Olympus" },
        { schedules },
      ),
    ).rejects.toThrow(ValidationError);
  });
});
