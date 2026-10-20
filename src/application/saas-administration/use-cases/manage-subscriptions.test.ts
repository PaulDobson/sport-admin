import { describe, expect, it, vi } from "vitest";
import type { SubscriptionManagementPort } from "../ports/subscription-management-port";
import { confirmSaasAssignment, getSaasSubscriptionManagement, previewSaasAssignment } from "./manage-subscriptions";

const tenantId = "ad440000-0000-4000-8000-000000000001";
const versionId = "ad440000-0000-4000-8000-000000000002";
const request = { tenantId, planVersionId: versionId, startsOn: "2028-01-31", useTrial: false, dueOn: null };
const confirmation = { ...request, operationId: tenantId, fingerprint: "a".repeat(32), reason: "Nueva contratación" };
function port(admin = true): SubscriptionManagementPort {
  return {
    isPlatformAdmin: vi.fn().mockResolvedValue(admin),
    getManagement: vi.fn(), previewAssignment: vi.fn(), confirmAssignment: vi.fn(),
  };
}
describe("subscription management authorization and validation", () => {
  it("passes only validated assignment requests and normalizes the audit reason", async () => {
    const repository = port();
    await previewSaasAssignment(request, repository);
    expect(repository.previewAssignment).toHaveBeenCalledWith(request);
    await confirmSaasAssignment({ ...confirmation, reason: "  Nueva contratación  " }, repository);
    expect(repository.confirmAssignment).toHaveBeenCalledWith(confirmation);
  });
  it.each([
    { tenantId: "wrong" }, { planVersionId: "" }, { startsOn: "2028-02-30" },
    { dueOn: "invalid" }, { useTrial: "true" },
  ])("rejects invalid request %j", async (update) => {
    const repository = port();
    await expect(previewSaasAssignment({ ...request, ...update }, repository)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(repository.previewAssignment).not.toHaveBeenCalled();
  });
  it.each([{ operationId: "" }, { fingerprint: "" }, { fingerprint: "not-a-preview" }, { reason: " " }])(
    "requires operation identity, preview and reason %j", async (update) => {
      const repository = port();
      await expect(confirmSaasAssignment({ ...confirmation, ...update }, repository)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      expect(repository.confirmAssignment).not.toHaveBeenCalled();
    },
  );
  it("rejects non-admin reads and writes before contacting financial RPCs", async () => {
    const repository = port(false);
    for (const call of [
      () => getSaasSubscriptionManagement(tenantId, repository),
      () => previewSaasAssignment(request, repository),
      () => confirmSaasAssignment(confirmation, repository),
    ]) await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(repository.getManagement).not.toHaveBeenCalled();
    expect(repository.previewAssignment).not.toHaveBeenCalled();
    expect(repository.confirmAssignment).not.toHaveBeenCalled();
  });
});
