import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ configuration: vi.fn(), secret: vi.fn(), deps: vi.fn(), batch: vi.fn() }));
vi.mock("@/infrastructure/composition/saas-renewal-composition", () => ({
  getSaasRenewalAuthorizationSecret: mocks.secret, getSaasRenewalConfiguration: mocks.configuration,
  createSaasRenewalWorkerDeps: mocks.deps,
}));
vi.mock("@/application/saas-administration/use-cases/process-subscription-renewals", () => ({ processSaasRenewalBatch: mocks.batch }));
function request(authorization?: string) {
  return new Request("http://localhost/api/saas/renewals/process", { method: "POST", headers: authorization ? { authorization } : {} });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.secret.mockReturnValue("a-private-scheduler-secret");
  mocks.configuration.mockReturnValue({ enabled: true, schedulerConfigured: true });
  mocks.batch.mockResolvedValue({ processed: 0, failed: 0, idle: true, results: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
describe("protected renewal processor endpoint", () => {
  it.each([undefined, "Basic credentials", "Bearer incorrect", "Bearer a-private-scheduler-secreu"])("rejects authorization %s before processing", async (auth) => {
    expect((await POST(request(auth))).status).toBe(401);
    expect(mocks.deps).not.toHaveBeenCalled();
    expect(mocks.batch).not.toHaveBeenCalled();
  });
  it("keeps the worker disabled by default without touching the ledger", async () => {
    mocks.configuration.mockReturnValue({ enabled: false });
    expect((await POST(request("Bearer a-private-scheduler-secret"))).status).toBe(503);
    expect(mocks.deps).not.toHaveBeenCalled();
  });
  it("processes an authorized bounded batch", async () => {
    const response = await POST(request("Bearer a-private-scheduler-secret"));
    expect(response.status).toBe(200);
    expect(mocks.batch).toHaveBeenCalledWith({ batchSize: 10 }, mocks.deps.mock.results[0].value);
    expect(await response.json()).toMatchObject({ processed: 0, idle: true });
  });
  it("uses multi-status for explicitly recorded period failures and logs no contract content", async () => {
    mocks.batch.mockResolvedValue({ processed: 2, failed: 1, idle: false, results: [{ status: "failed" }] });
    expect((await POST(request("Bearer a-private-scheduler-secret"))).status).toBe(207);
    expect(console.error).toHaveBeenCalledWith(expect.any(String), { failed: 1, processed: 2 });
  });
  it("does not expose unexpected error details or configuration secrets", async () => {
    mocks.secret.mockImplementation(() => { throw new Error("secret value: tenant details"); });
    const response = await POST(request("Bearer a-private-scheduler-secret"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("tenant details");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("tenant details");
    expect(mocks.deps).not.toHaveBeenCalled();
  });
});
