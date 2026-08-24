import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { FakeFinancialProjectionRepository } from "../testing/fake-financial-projection-repository";
import { getMonthlyFinancialProjection } from "./get-monthly-financial-projection";

const tenantId = "c0000000-0000-4000-8000-000000000001";

describe("get monthly financial projection", () => {
  it("returns one projection per currency", async () => {
    const repository = new FakeFinancialProjectionRepository();
    repository.data.memberships.push({
      id: "membership",
      startsOn: "2026-01-01",
      expiresOn: "2026-12-31",
      agreedPrice: 1200,
      currency: "USD",
      billingCycle: "annual",
      status: "active",
      expirationGraceDays: 0,
    });

    await expect(
      getMonthlyFinancialProjection(
        { tenantId, period: "2026-08" },
        { financialProjections: repository },
      ),
    ).resolves.toEqual([
      {
        period: "2026-08",
        currency: "USD",
        contractedAmount: 100,
        collectibleAmount: 100,
        collectedAmount: 0,
      },
    ]);
  });

  it("rejects an invalid accounting period", async () => {
    const repository = new FakeFinancialProjectionRepository();
    await expect(
      getMonthlyFinancialProjection(
        { tenantId, period: "2026-13" },
        { financialProjections: repository },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
