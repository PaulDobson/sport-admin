import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { deleteClassTemplate, updateClassTemplate } from "./manage-class-templates";

const tenantId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const classes = { update: vi.fn(), delete: vi.fn() };
const input = { tenantId, id, name: " Yoga inicial ", capacity: 16 };
beforeEach(() => vi.resetAllMocks());

describe("class template administration use cases", () => {
  it("trims names and passes only editable fields", async () => {
    await updateClassTemplate({ ...input, ...{ disciplineId: "forged", status: "archived" } }, { classes });
    expect(classes.update).toHaveBeenCalledWith({ tenantId, id, name: "Yoga inicial", capacity: 16 });
  });
  it.each([0, -1, 501, 1.5, NaN, Infinity])("rejects capacity %s before persistence", async (capacity) => {
    await expect(updateClassTemplate({ ...input, capacity }, { classes })).rejects.toBeInstanceOf(ValidationError);
    expect(classes.update).not.toHaveBeenCalled();
  });
  it.each([1, 500])("accepts capacity boundary %s", async (capacity) => {
    await updateClassTemplate({ ...input, capacity }, { classes });
    expect(classes.update).toHaveBeenCalledWith(expect.objectContaining({ capacity }));
  });
  it.each([" ", "a".repeat(101)])("rejects invalid names", async (name) => {
    await expect(updateClassTemplate({ ...input, name }, { classes })).rejects.toBeInstanceOf(ValidationError);
    expect(classes.update).not.toHaveBeenCalled();
  });
  it("validates deletion identity", async () => {
    await expect(deleteClassTemplate({ tenantId, id: "bad-id" }, { classes })).rejects.toBeInstanceOf(ValidationError);
    expect(classes.delete).not.toHaveBeenCalled();
    await deleteClassTemplate({ tenantId, id }, { classes });
    expect(classes.delete).toHaveBeenCalledWith({ tenantId, id });
  });
  it("propagates storage errors instead of reporting success", async () => {
    classes.update.mockRejectedValue(new Error("offline"));
    await expect(updateClassTemplate(input, { classes })).rejects.toThrow("offline");
  });
});
