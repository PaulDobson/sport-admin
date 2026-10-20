import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/domain/shared/errors";
import type { AssignmentFormState } from "./actions";
import { assignmentAction, cancelPlanChangeAction, planChangeAction } from "./actions";

const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), preview: vi.fn(), confirm: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({ auth: { getCurrentUserId: mocks.user } }),
}));
vi.mock("@/infrastructure/composition/saas-administration-composition", () => ({
  createSaasAdministrationDeps: async () => ({ subscriptions: {
    isPlatformAdmin: mocks.admin, previewAssignment: mocks.preview, confirmAssignment: mocks.confirm,
    previewPlanChange: mocks.preview, confirmPlanChange: mocks.confirm, cancelPlanChange: mocks.confirm,
  } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const initial: AssignmentFormState = { error: null, fieldErrors: {}, preview: null, result: null, stale: false };
const tenantId = "ad440000-0000-4000-8000-000000000001";
function form(confirming = false) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    tenantId, planVersionId: tenantId, startsOn: "2028-01-31", dueOn: "",
    intent: confirming ? "confirm" : "preview", fingerprint: "a".repeat(32),
    operationId: tenantId, reason: "Asignación inicial", accepted: "on",
  })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue("admin");
  mocks.admin.mockResolvedValue(true);
  mocks.preview.mockResolvedValue({ fingerprint: "a".repeat(32) });
  mocks.confirm.mockResolvedValue({ tenantId, subscriptionId: tenantId });
});

describe("contractual change actions", () => {
  const state = { error: null, preview: null, result: null, stale: false };
  it("previews without invalidation or writes", async () => {
    expect(await planChangeAction(state, form())).toMatchObject({ error: null, preview: { fingerprint: "a".repeat(32) } });
    expect(mocks.preview).toHaveBeenCalledWith({ tenantId, planVersionId: tenantId });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("requires explicit financial acceptance", async () => {
    const data = form(true); data.delete("accepted");
    expect(await planChangeAction(state, data)).toMatchObject({ result: null, error: expect.any(String) });
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("passes operation identity and refreshes metrics only after confirmation", async () => {
    expect(await planChangeAction(state, form(true))).toMatchObject({ error: null, result: { tenantId } });
    expect(mocks.confirm).toHaveBeenCalledWith({
      tenantId, planVersionId: tenantId, operationId: tenantId, fingerprint: "a".repeat(32), reason: "Asignación inicial",
    });
    expect(mocks.revalidate.mock.calls).toEqual([["/backoffice/tenants"], ["/backoffice/finance"]]);
  });
  it("does not retain stale quote or report success", async () => {
    mocks.confirm.mockRejectedValueOnce(new ConflictError("Contrato cambió"));
    expect(await planChangeAction(state, form(true))).toMatchObject({ preview: null, result: null, stale: true });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("rejects direct requests by a non-admin", async () => {
    mocks.admin.mockResolvedValue(false);
    expect(await planChangeAction(state, form(true))).toMatchObject({ result: null, error: expect.any(String) });
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("cancels with a reason and explicit change identity", async () => {
    const data = form(true); data.set("scheduledChangeId", tenantId);
    expect(await cancelPlanChangeAction({ saved: false, error: null }, data)).toEqual({ saved: true, error: null });
    expect(mocks.confirm).toHaveBeenCalledWith({
      tenantId, scheduledChangeId: tenantId, operationId: tenantId, reason: "Asignación inicial",
    });
  });
});

describe("assignment actions", () => {
  it("previews without persisting, retaining default due date as null", async () => {
    expect(await assignmentAction(initial, form())).toMatchObject({ error: null, result: null, preview: { fingerprint: "a".repeat(32) } });
    expect(mocks.preview).toHaveBeenCalledWith({
      tenantId, planVersionId: tenantId, startsOn: "2028-01-31", useTrial: false, dueOn: null,
    });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("requires explicit review acceptance before confirmation", async () => {
    const data = form(true);
    data.delete("accepted");
    expect(await assignmentAction(initial, data)).toMatchObject({ result: null, fieldErrors: { accepted: expect.any(String) } });
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("confirms with operation identity and refreshes tenant and financial views only after success", async () => {
    expect(await assignmentAction(initial, form(true))).toMatchObject({ result: { tenantId }, error: null });
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      fingerprint: "a".repeat(32), operationId: tenantId, reason: "Asignación inicial",
    }));
    expect(mocks.revalidate.mock.calls).toEqual([["/backoffice/tenants"], ["/backoffice/finance"]]);
  });
  it("clears stale preview and does not claim a successful assignment", async () => {
    mocks.confirm.mockRejectedValueOnce(new ConflictError("Uso actualizado; vuelve a revisar."));
    expect(await assignmentAction(initial, form(true))).toMatchObject({ preview: null, result: null, stale: true, error: expect.stringContaining("Uso actualizado") });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("enforces platform admin permissions for direct requests", async () => {
    mocks.admin.mockResolvedValue(false);
    expect(await assignmentAction(initial, form(true))).toMatchObject({ result: null, error: expect.stringContaining("administrador") });
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("logs unexpected transport errors without returning a false success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.confirm.mockRejectedValueOnce(new Error("network timeout"));
    expect(await assignmentAction(initial, form(true))).toMatchObject({ result: null, stale: false, error: expect.any(String) });
    expect(log).toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
