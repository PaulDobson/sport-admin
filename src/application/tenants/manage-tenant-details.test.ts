import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantMembership } from "@/domain/tenants/tenant-membership";
import { NotFoundError, UnauthorizedError, ValidationError } from "@/domain/shared/errors";
import { getTenantDetails, updateTenantDetails, type TenantDetailsInput } from "./manage-tenant-details";

const membership: TenantMembership = {
  id: "membership", tenantId: "tenant-a", userId: "user", role: "owner", status: "active", createdAt: new Date(),
};
const input: TenantDetailsInput = { name: "Academia", address: "", contactName: "", contactEmail: "", phone: "", city: "", region: "" };
const repository = { findByTenantId: vi.fn(), update: vi.fn() };
beforeEach(() => vi.resetAllMocks());

describe("tenant details", () => {
  it.each(["owner", "admin"] as const)("allows %s to save only the name and clear optional fields", async role => {
    const details = await updateTenantDetails({ ...membership, role }, input, repository);
    expect(details).toEqual({ tenantId: "tenant-a", name: "Academia", address: null, contactName: null, contactEmail: null, phone: null, city: null, region: null });
    expect(repository.update).toHaveBeenCalledWith(details);
  });

  it("normalizes fields without changing the selected tenant", async () => {
    const details = await updateTenantDetails(membership, {
      name: "  Academia Central  ", address: "  Av. Central 1 ", contactName: " Ana Pérez ",
      contactEmail: " ana@example.cl ", phone: " +56 (9) 1234-5678 ", city: " Santiago ", region: " Metropolitana ",
    }, repository);
    expect(details).toEqual({ tenantId: "tenant-a", name: "Academia Central", address: "Av. Central 1", contactName: "Ana Pérez", contactEmail: "ana@example.cl", phone: "+56 (9) 1234-5678", city: "Santiago", region: "Metropolitana" });
  });

  it.each(["instructor", "assistant"] as const)("blocks %s before accessing storage", async role => {
    await expect(getTenantDetails({ ...membership, role }, repository)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(updateTenantDetails({ ...membership, role }, input, repository)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.findByTenantId).not.toHaveBeenCalled();
  });

  it.each(["invited", "suspended", "revoked"] as const)("blocks a %s membership", async status => {
    await expect(updateTenantDetails({ ...membership, status }, input, repository)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it.each([
    ["name", " "], ["name", "a".repeat(161)], ["address", "a".repeat(251)],
    ["contactName", "a".repeat(121)], ["contactEmail", "invalid@"],
    ["phone", "123456"], ["phone", "call me"], ["phone", "1".repeat(31)],
    ["city", "a".repeat(121)], ["region", "a".repeat(121)],
  ])("rejects invalid %s", async (field, value) => {
    await expect(updateTenantDetails(membership, { ...input, [field]: value }, repository)).rejects.toBeInstanceOf(ValidationError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("accepts exact maximum text lengths", async () => {
    await updateTenantDetails(membership, { ...input, name: "a".repeat(160), address: "a".repeat(250), contactName: "a".repeat(120), city: "a".repeat(120), region: "a".repeat(120), phone: "1".repeat(30) }, repository);
    expect(repository.update).toHaveBeenCalledOnce();
  });

  it("loads by membership tenant and reports missing data", async () => {
    repository.findByTenantId.mockResolvedValue(null);
    await expect(getTenantDetails(membership, repository)).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findByTenantId).toHaveBeenCalledWith("tenant-a");
  });

  it("propagates storage failures without reporting success", async () => {
    repository.update.mockRejectedValue(new Error("database offline"));
    await expect(updateTenantDetails(membership, input, repository)).rejects.toThrow("database offline");
  });
});
