import { describe, expect, it } from "vitest";
import type { CollectionAccount } from "./collection";
import { deriveCollectionItems, summarizeCollections } from "./collection";

function account(
  overrides: Partial<CollectionAccount> &
    Pick<CollectionAccount, "membershipId">,
): CollectionAccount {
  return {
    studentId: `student-${overrides.membershipId}`,
    studentName: "Ana",
    planName: "Mensual",
    status: "active",
    expiresOn: "2026-08-30",
    nextBillingDate: "2026-08-31",
    expirationGraceDays: 5,
    currency: "CLP",
    contractedAmount: 45000,
    balance: 45000,
    ...overrides,
  };
}

describe("collection derivation", () => {
  it("omits memberships without outstanding balance", () => {
    const items = deriveCollectionItems(
      [account({ membershipId: "settled", balance: 0 })],
      { onDate: "2026-09-10" },
    );

    expect(items).toEqual([]);
  });

  it("keeps memberships with a partial balance", () => {
    const items = deriveCollectionItems(
      [account({ membershipId: "partial", balance: 15000 })],
      { onDate: "2026-09-10" },
    );

    expect(items).toHaveLength(1);
    expect(items[0].balance).toBe(15000);
  });

  it("excludes paused and cancelled memberships", () => {
    const items = deriveCollectionItems(
      [
        account({ membershipId: "paused", status: "paused" }),
        account({ membershipId: "cancelled", status: "cancelled" }),
        account({ membershipId: "active", status: "active" }),
      ],
      { onDate: "2026-09-10" },
    );

    expect(items.map((item) => item.membershipId)).toEqual(["active"]);
  });

  it("counts overdue days only after the grace period", () => {
    const [withinGrace] = deriveCollectionItems(
      [account({ membershipId: "grace", expirationGraceDays: 5 })],
      { onDate: "2026-09-04" },
    );
    const [overdue] = deriveCollectionItems(
      [account({ membershipId: "overdue", expirationGraceDays: 5 })],
      { onDate: "2026-09-10" },
    );

    expect(withinGrace.isOverdue).toBe(false);
    expect(withinGrace.overdueDays).toBe(0);
    expect(overdue.isOverdue).toBe(true);
    expect(overdue.overdueDays).toBe(5);
  });

  it("orders by overdue age and filters by status and date range", () => {
    const items = deriveCollectionItems(
      [
        account({ membershipId: "recent", nextBillingDate: "2026-09-01" }),
        account({
          membershipId: "oldest",
          nextBillingDate: "2026-07-01",
          studentName: "Bruno",
        }),
        account({
          membershipId: "expired",
          status: "expired",
          nextBillingDate: "2026-08-01",
        }),
      ],
      { onDate: "2026-09-10", from: "2026-07-01", to: "2026-09-05" },
    );

    expect(items.map((item) => item.membershipId)).toEqual([
      "oldest",
      "expired",
      "recent",
    ]);

    const onlyExpired = deriveCollectionItems(
      [
        account({ membershipId: "active", status: "active" }),
        account({ membershipId: "expired", status: "expired" }),
      ],
      { onDate: "2026-09-10", status: "expired" },
    );
    expect(onlyExpired.map((item) => item.membershipId)).toEqual(["expired"]);
  });

  it("totals pending and overdue amounts per currency", () => {
    const totals = summarizeCollections(
      deriveCollectionItems(
        [
          account({ membershipId: "overdue", balance: 45000 }),
          account({
            membershipId: "upcoming",
            balance: 10000,
            nextBillingDate: "2026-09-30",
          }),
          account({
            membershipId: "other-currency",
            balance: 100,
            currency: "USD",
          }),
        ],
        { onDate: "2026-09-10" },
      ),
    );

    expect(totals).toEqual([
      {
        currency: "CLP",
        pendingAmount: 55000,
        overdueAmount: 45000,
        accountCount: 2,
      },
      {
        currency: "USD",
        pendingAmount: 100,
        overdueAmount: 100,
        accountCount: 1,
      },
    ]);
  });
});
