import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanChangePort } from "../ports/plan-change-port";
import { cancelSaasPlanChange, confirmSaasPlanChange, previewSaasPlanChange } from "./change-subscription-plan";

const repository: PlanChangePort = {
  isPlatformAdmin: vi.fn(), previewPlanChange: vi.fn(), confirmPlanChange: vi.fn(), cancelPlanChange: vi.fn(),
};
const id = "ad460000-0000-4000-8000-000000000001";
const request = { tenantId: id, planVersionId: id };
const confirmation = { ...request, operationId: id, fingerprint: "a".repeat(32), reason: "Cambio acordado" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(repository.isPlatformAdmin).mockResolvedValue(true); });
describe("commercial plan change authorization and inputs", () => {
  it.each(["preview", "confirm", "cancel"])("requires admin for %s", async (kind) => {
    vi.mocked(repository.isPlatformAdmin).mockResolvedValue(false);
    const call = kind === "preview" ? previewSaasPlanChange(request, repository)
      : kind === "confirm" ? confirmSaasPlanChange(confirmation, repository)
        : cancelSaasPlanChange({ tenantId: id, scheduledChangeId: id, operationId: id, reason: "Cancelar" }, repository);
    await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(repository.previewPlanChange).not.toHaveBeenCalled();
    expect(repository.confirmPlanChange).not.toHaveBeenCalled();
    expect(repository.cancelPlanChange).not.toHaveBeenCalled();
  });
  it("strips client amounts and delegates the authoritative preview", async () => {
    await previewSaasPlanChange({ ...request, amountDue: 1 }, repository);
    expect(repository.previewPlanChange).toHaveBeenCalledWith(request);
  });
  it("normalizes the reason and never forwards client amounts", async () => {
    await confirmSaasPlanChange({ ...confirmation, reason: "  Cambio acordado  ", amountDue: 1 }, repository);
    expect(repository.confirmPlanChange).toHaveBeenCalledWith(confirmation);
  });
  it.each([{ operationId: "bad" }, { reason: "x" }, { reason: "x".repeat(501) }, { fingerprint: "" }, { tenantId: "" }])(
    "rejects invalid confirmation %j", async (override) => {
      await expect(confirmSaasPlanChange({ ...confirmation, ...override }, repository)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      expect(repository.confirmPlanChange).not.toHaveBeenCalled();
    },
  );
  it("cancels with explicit tenant/change/operation identity", async () => {
    const input = { tenantId: id, scheduledChangeId: id, operationId: id, reason: "Cancelación solicitada" };
    await cancelSaasPlanChange(input, repository);
    expect(repository.cancelPlanChange).toHaveBeenCalledWith(input);
  });
});
