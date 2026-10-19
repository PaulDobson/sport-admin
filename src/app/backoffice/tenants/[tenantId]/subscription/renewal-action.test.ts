import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/domain/shared/errors";
import { renewalAction } from "./renewal-action";

const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), process: vi.fn(), configuration: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/infrastructure/composition/auth-composition", () => ({ createAuthDeps: async () => ({ auth: { getCurrentUserId: mocks.user } }) }));
vi.mock("@/infrastructure/composition/saas-administration-composition", () => ({
  createSaasAdministrationDeps: async () => ({ renewals: { isPlatformAdmin: mocks.admin, process: mocks.process } }),
}));
vi.mock("@/infrastructure/composition/saas-renewal-composition", () => ({ getSaasRenewalConfiguration: mocks.configuration }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const id = "ad470000-0000-4000-8000-000000000001";
const initial = { error: null, result: null };
function form() {
  const data = new FormData();
  Object.entries({ requestId: id, subscriptionId: id, expectedPeriodEnd: "2028-02-29", accepted: "on" }).forEach(([k, v]) => data.set(k, v));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue(id); mocks.admin.mockResolvedValue(true);
  mocks.configuration.mockReturnValue({ enabled: true });
  mocks.process.mockResolvedValue({ status: "renewed", tenantId: id, subscriptionId: id });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
describe("manual renewal action", () => {
  it("rejects disabled processing without invoking a mutation", async () => {
    mocks.configuration.mockReturnValue({ enabled: false });
    expect(await renewalAction(initial, form())).toMatchObject({ result: null, error: expect.stringContaining("desactivadas") });
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("requires explicit review and admin authorization", async () => {
    const data = form(); data.delete("accepted");
    expect(await renewalAction(initial, data)).toMatchObject({ result: null, error: expect.any(String) });
    mocks.admin.mockResolvedValue(false);
    expect(await renewalAction(initial, form())).toMatchObject({ result: null, error: expect.any(String) });
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("sends only authoritative identity and revalidates after the period was persisted", async () => {
    expect(await renewalAction(initial, form())).toMatchObject({ result: { status: "renewed" }, error: null });
    expect(mocks.process).toHaveBeenCalledWith({ requestId: id, subscriptionId: id, expectedPeriodEnd: "2028-02-29" });
    expect(mocks.revalidate.mock.calls).toEqual([
      ["/backoffice/finance/renewals"], ["/backoffice/tenants"], [`/backoffice/tenants/${id}/subscription`], ["/backoffice/finance"],
    ]);
  });
  it("logs a recorded failure and never presents it as a renewed period", async () => {
    mocks.process.mockResolvedValue({ status: "failed", errorCode: "22023", message: "Conciliar contrato" });
    expect(await renewalAction(initial, form())).toEqual({ error: "Conciliar contrato", result: null });
    expect(mocks.revalidate.mock.calls).toEqual([["/backoffice/finance/renewals"]]);
    expect(console.error).toHaveBeenCalledWith(expect.any(String), { code: "22023" });
  });
  it("surfaces a stale boundary without financial invalidation", async () => {
    mocks.process.mockRejectedValue(new ConflictError("Actualiza el período"));
    expect(await renewalAction(initial, form())).toMatchObject({ result: null, error: "Actualiza el período" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
