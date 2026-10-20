import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RenewalAdministrationPort } from "../ports/renewal-processing-port";
import { getSaasRenewalStatus, processSaasRenewalBatch, renewSaasSubscription } from "./process-subscription-renewals";

const id = "ad470000-0000-4000-8000-000000000001";
const repository: RenewalAdministrationPort = { isPlatformAdmin: vi.fn(), getStatus: vi.fn(), process: vi.fn() };
const deps = { renewals: repository, newRequestId: vi.fn(() => id) };
const manual = { requestId: id, subscriptionId: id, expectedPeriodEnd: "2028-02-29" };
const failed = { status: "failed" as const, tenantId: id, subscriptionId: id, periodStartsOn: "2028-02-29", errorCode: "22023", message: "Conciliar" };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(repository.isPlatformAdmin).mockResolvedValue(true); deps.newRequestId.mockReturnValue(id); });
describe("bounded renewal processing", () => {
  it("stops at idle and does not manufacture processed rows", async () => {
    vi.mocked(repository.process).mockResolvedValue({ status: "idle" });
    expect(await processSaasRenewalBatch({ batchSize: 10 }, deps)).toEqual({ processed: 0, failed: 0, results: [], idle: true });
    expect(repository.process).toHaveBeenCalledOnce();
  });
  it("bounds a backlog even if every RPC processes a period", async () => {
    vi.mocked(repository.process).mockResolvedValue(failed);
    const result = await processSaasRenewalBatch({ batchSize: 10 }, deps);
    expect(result).toMatchObject({ processed: 10, failed: 10, idle: false });
    expect(repository.process).toHaveBeenCalledTimes(10);
    expect(repository.process).toHaveBeenCalledWith({ requestId: id, subscriptionId: null, expectedPeriodEnd: null });
  });
  it("continues past a recorded failed period and reports the failure explicitly", async () => {
    vi.mocked(repository.process).mockResolvedValueOnce(failed).mockResolvedValueOnce({ status: "idle" });
    expect(await processSaasRenewalBatch({ batchSize: 2 }, deps)).toMatchObject({ processed: 1, failed: 1, results: [failed], idle: true });
  });
  it("does not hide transport or schema failures as idle", async () => {
    vi.mocked(repository.process).mockRejectedValue(new Error("RPC unavailable"));
    await expect(processSaasRenewalBatch({ batchSize: 2 }, deps)).rejects.toThrow("RPC unavailable");
  });
  it.each([0, -1, 11, 1.5])("rejects unsafe batch size %s", async (batchSize) => {
    await expect(processSaasRenewalBatch({ batchSize }, deps)).rejects.toThrow();
    expect(repository.process).not.toHaveBeenCalled();
  });
  it("rejects an invalid request identity before calling the database", async () => {
    deps.newRequestId.mockReturnValue("invalid");
    await expect(processSaasRenewalBatch({ batchSize: 1 }, deps)).rejects.toThrow();
    expect(repository.process).not.toHaveBeenCalled();
  });
});
describe("manual renewal administration", () => {
  it("requires admin for manual renewal and status", async () => {
    vi.mocked(repository.isPlatformAdmin).mockResolvedValue(false);
    await expect(renewSaasSubscription(manual, repository)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(getSaasRenewalStatus(null, repository)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(repository.process).not.toHaveBeenCalled();
    expect(repository.getStatus).not.toHaveBeenCalled();
  });
  it("requires the exact reviewed period and strips client prices", async () => {
    await renewSaasSubscription({ ...manual, price: 1 }, repository);
    expect(repository.process).toHaveBeenCalledWith(manual);
  });
  it.each([{ expectedPeriodEnd: null }, { expectedPeriodEnd: "2028-02-30" }, { subscriptionId: null }, { requestId: "bad" }])(
    "rejects invalid manual request %j", async (override) => {
      await expect(renewSaasSubscription({ ...manual, ...override }, repository)).rejects.toThrow();
      expect(repository.process).not.toHaveBeenCalled();
    },
  );
});
