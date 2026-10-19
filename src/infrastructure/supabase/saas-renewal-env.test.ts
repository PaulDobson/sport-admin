import { afterEach, describe, expect, it, vi } from "vitest";
import { getSaasRenewalReadiness, getSaasRenewalWorkerSecret } from "./env";
afterEach(() => vi.unstubAllEnvs());
describe("renewal environment safeguards", () => {
  it("is disabled without explicit opt-in", () => {
    vi.stubEnv("SAAS_RENEWALS_ENABLED", undefined);
    vi.stubEnv("SAAS_RENEWAL_WORKER_SECRET", undefined);
    expect(getSaasRenewalReadiness()).toEqual({ enabled: false, schedulerConfigured: false });
  });
  it("does not expose a secret through readiness", () => {
    vi.stubEnv("SAAS_RENEWALS_ENABLED", "true");
    vi.stubEnv("SAAS_RENEWAL_WORKER_SECRET", "secret");
    expect(getSaasRenewalReadiness()).toEqual({ enabled: true, schedulerConfigured: true });
  });
  it("rejects a misspelled feature flag", () => {
    vi.stubEnv("SAAS_RENEWALS_ENABLED", "yes");
    expect(() => getSaasRenewalReadiness()).toThrow("must be true or false");
  });
  it("does not substitute the notification secret for a missing billing secret", () => {
    vi.stubEnv("SAAS_RENEWAL_WORKER_SECRET", undefined);
    vi.stubEnv("NOTIFICATION_WORKER_SECRET", "another-secret");
    expect(() => getSaasRenewalWorkerSecret()).toThrow("SAAS_RENEWAL_WORKER_SECRET");
  });
});
