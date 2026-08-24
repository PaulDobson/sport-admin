import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import type { MembershipFollowUpRepositoryPort } from "../ports/membership-follow-up-repository-port";
import { getMembershipFollowUps } from "./get-membership-follow-ups";

const tenantId = "c0000000-0000-4000-8000-000000000001";

const repository: MembershipFollowUpRepositoryPort = {
  async listByTenant() {
    return [
      {
        membershipId: "membership",
        studentId: "student",
        studentName: "Ana",
        status: "past_due",
        expiresOn: "2026-07-31",
        nextBillingDate: "2026-08-01",
        pastDueSince: "2026-08-01",
        currency: "USD",
        balance: 1125,
      },
    ];
  },
};

describe("get membership follow-ups", () => {
  it("applies status and date filters", async () => {
    await expect(
      getMembershipFollowUps(
        {
          tenantId,
          from: "2026-08-01",
          to: "2026-08-31",
          status: "past_due",
        },
        { membershipFollowUps: repository },
      ),
    ).resolves.toEqual([
      expect.objectContaining({ membershipId: "membership", balance: 1125 }),
    ]);
  });

  it("rejects an inverted date range", async () => {
    await expect(
      getMembershipFollowUps(
        { tenantId, from: "2026-09-01", to: "2026-08-01" },
        { membershipFollowUps: repository },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
