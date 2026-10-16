import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeScheduleRepository } from "../testing/fake-schedule-repository";
import { createClassTemplate } from "./create-class-template";
import { BusinessRuleViolationError, ValidationError } from "@/domain/shared/errors";

const tenantId = "11111111-1111-4111-8111-111111111111";
const disciplineId = "22222222-2222-4222-8222-222222222222";
const input = { tenantId, disciplineId, name: " Yoga inicial ", capacity: 16 };
const findActiveDiscipline = vi.fn();
let schedules: FakeScheduleRepository;
beforeEach(() => {
  findActiveDiscipline.mockReset();
  schedules = new FakeScheduleRepository();
});

describe("class template discipline selection", () => {
  it("creates a class only with an active discipline belonging to the tenant", async () => {
    findActiveDiscipline.mockResolvedValue({ id: disciplineId });
    const result = await createClassTemplate(input, { schedules, catalog: { findActiveDiscipline } });
    expect(findActiveDiscipline).toHaveBeenCalledWith(tenantId, disciplineId);
    expect(result).toMatchObject({ tenantId, disciplineId, name: "Yoga inicial", capacity: 16 });
    expect(schedules.disciplines).toHaveLength(0);
  });
  it("rejects absent, archived or foreign disciplines without creating a class", async () => {
    findActiveDiscipline.mockResolvedValue(null);
    await expect(createClassTemplate(input, { schedules, catalog: { findActiveDiscipline } })).rejects.toBeInstanceOf(BusinessRuleViolationError);
    expect(schedules.templates).toHaveLength(0);
    expect(schedules.disciplines).toHaveLength(0);
  });
  it.each(["", "Yoga", "invalid-id"])("rejects invalid discipline ID %s before querying", async (id) => {
    await expect(createClassTemplate({ ...input, disciplineId: id }, { schedules, catalog: { findActiveDiscipline } })).rejects.toBeInstanceOf(ValidationError);
    expect(findActiveDiscipline).not.toHaveBeenCalled();
    expect(schedules.templates).toHaveLength(0);
  });
  it("propagates catalog failures without creating a class", async () => {
    findActiveDiscipline.mockRejectedValue(new Error("Database unavailable"));
    await expect(createClassTemplate(input, { schedules, catalog: { findActiveDiscipline } })).rejects.toThrow("Database unavailable");
    expect(schedules.templates).toHaveLength(0);
  });
});
