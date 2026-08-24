import { describe, expect, it } from "vitest";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { requireSaasFeature } from "./require-saas-feature";

describe("requireSaasFeature", () => {
  it("allows a feature included in the current plan", async () => {
    await expect(
      requireSaasFeature(
        {
          tenantId: "a1000000-0000-4000-8000-000000000001",
          feature: "offline",
        },
        { canUseFeature: async () => true },
      ),
    ).resolves.toBeUndefined();
  });

  it("supports push as a phase-three plan feature", async () => {
    await expect(
      requireSaasFeature(
        {
          tenantId: "a1000000-0000-4000-8000-000000000001",
          feature: "push",
        },
        { canUseFeature: async (_tenantId, feature) => feature === "push" },
      ),
    ).resolves.toBeUndefined();
  });

  it("returns an actionable plan error for an unavailable feature", async () => {
    await expect(
      requireSaasFeature(
        {
          tenantId: "a1000000-0000-4000-8000-000000000001",
          feature: "reports",
        },
        { canUseFeature: async () => false },
      ),
    ).rejects.toThrow(BusinessRuleViolationError);
  });
});
