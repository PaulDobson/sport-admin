import { describe, expect, it } from "vitest";
import type { MembershipFollowUpAccount } from "./membership-follow-up";
import { filterMembershipFollowUps } from "./membership-follow-up";

const accounts: MembershipFollowUpAccount[] = [
  {
    membershipId: "active",
    studentId: "student-a",
    studentName: "Ana",
    status: "active",
    expiresOn: "2026-08-30",
    nextBillingDate: "2026-08-31",
    currency: "USD",
    balance: 380,
  },
  {
    membershipId: "past-due",
    studentId: "student-b",
    studentName: "Bruno",
    status: "past_due",
    expiresOn: "2026-07-31",
    nextBillingDate: "2026-08-01",
    pastDueSince: "2026-08-01",
    currency: "USD",
    balance: 1125,
  },
  {
    membershipId: "expired",
    studentId: "student-c",
    studentName: "Carla",
    status: "expired",
    expiresOn: "2026-07-31",
    nextBillingDate: "2026-08-01",
    currency: "EUR",
    balance: 100,
  },
];

describe("membership follow-up", () => {
  it("filters overdue accounts by status and inclusive date range", () => {
    expect(
      filterMembershipFollowUps(accounts, {
        from: "2026-08-01",
        to: "2026-08-31",
        status: "past_due",
      }),
    ).toEqual([
      expect.objectContaining({
        membershipId: "past-due",
        kind: "past_due",
        followUpOn: "2026-08-01",
        balance: 1125,
      }),
    ]);
  });

  it("separates upcoming renewals from expirations", () => {
    expect(
      filterMembershipFollowUps(accounts, {
        from: "2026-07-01",
        to: "2026-08-31",
      }).map(({ membershipId, kind }) => ({ membershipId, kind })),
    ).toEqual([
      { membershipId: "expired", kind: "expiration" },
      { membershipId: "past-due", kind: "past_due" },
      { membershipId: "active", kind: "renewal" },
    ]);
  });
});
