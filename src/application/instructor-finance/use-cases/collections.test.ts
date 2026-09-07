import { beforeEach, describe, expect, it } from "vitest";
import { FakeCollectionRepository } from "../testing/fake-collection-repository";
import { FakePaymentRepository } from "../testing/fake-payment-repository";
import { getCollectionPeriodReport } from "./get-collection-period-report";
import { listPendingCollections } from "./list-pending-collections";

const tenantId = "bb000000-0000-4000-8000-000000000001";
const membershipId = "bb000000-0000-4000-8000-000000000002";
const actorMembershipId = "bb000000-0000-4000-8000-000000000003";

let collections: FakeCollectionRepository;
let payments: FakePaymentRepository;

beforeEach(() => {
  collections = new FakeCollectionRepository();
  payments = new FakePaymentRepository();
  collections.accounts = [
    {
      tenantId,
      membershipId,
      studentId: "bb000000-0000-4000-8000-000000000010",
      studentName: "Ana",
      planName: "Mensual",
      status: "active",
      expiresOn: "2026-08-30",
      nextBillingDate: "2026-08-31",
      expirationGraceDays: 5,
      currency: "CLP",
      contractedAmount: 45000,
      balance: 45000,
    },
    {
      tenantId,
      membershipId: "bb000000-0000-4000-8000-000000000004",
      studentId: "bb000000-0000-4000-8000-000000000011",
      studentName: "Bruno",
      planName: "Mensual",
      status: "past_due",
      expiresOn: "2026-07-31",
      nextBillingDate: "2026-07-31",
      expirationGraceDays: 0,
      currency: "CLP",
      contractedAmount: 45000,
      balance: 20000,
    },
    {
      tenantId,
      membershipId: "bb000000-0000-4000-8000-000000000005",
      studentId: "bb000000-0000-4000-8000-000000000012",
      studentName: "Carla",
      planName: "Mensual",
      status: "active",
      expiresOn: "2026-09-30",
      nextBillingDate: "2026-09-30",
      expirationGraceDays: 5,
      currency: "CLP",
      contractedAmount: 45000,
      balance: 0,
    },
  ];
});

describe("pending collections", () => {
  it("lists only memberships with an outstanding balance, oldest first", async () => {
    const items = await listPendingCollections(
      { tenantId, onDate: "2026-09-10" },
      { collections },
    );

    expect(items.map((item) => item.studentName)).toEqual(["Bruno", "Ana"]);
    expect(items[0].overdueDays).toBe(41);
    expect(items[1].overdueDays).toBe(5);
  });

  it("filters by membership status and date range", async () => {
    await expect(
      listPendingCollections(
        { tenantId, onDate: "2026-09-10", status: "past_due" },
        { collections },
      ),
    ).resolves.toHaveLength(1);
    await expect(
      listPendingCollections(
        { tenantId, onDate: "2026-09-10", from: "2026-08-01" },
        { collections },
      ),
    ).resolves.toHaveLength(1);
  });

  it("drops the pending item once the balance is settled", async () => {
    collections.accounts[0].balance = 0;
    collections.accounts[1].balance = 0;

    await expect(
      listPendingCollections(
        { tenantId, onDate: "2026-09-10" },
        {
          collections,
        },
      ),
    ).resolves.toEqual([]);
  });
});

describe("collection period report", () => {
  beforeEach(async () => {
    payments.memberships = [
      { id: membershipId, tenantId, agreedPrice: 45000, currency: "CLP" },
    ];
    await payments.record({
      tenantId,
      membershipId,
      amount: 20000,
      currency: "CLP",
      method: "cash",
      paidAt: new Date("2026-09-02T12:00:00Z"),
      actorMembershipId,
      operationId: "bb000000-0000-4000-8000-000000000021",
      adjustments: [],
    });
    await payments.record({
      tenantId,
      membershipId,
      amount: 5000,
      currency: "CLP",
      method: "transfer",
      paidAt: new Date("2026-09-03T12:00:00Z"),
      actorMembershipId,
      operationId: "bb000000-0000-4000-8000-000000000022",
      adjustments: [],
    });
  });

  it("filters collected payments by method", async () => {
    const report = await getCollectionPeriodReport(
      { tenantId, period: "2026-09", onDate: "2026-09-10", method: "cash" },
      { payments, collections },
    );

    expect(report.payments).toHaveLength(1);
    expect(report.byCurrency[0].collectedAmount).toBe(20000);
    expect(report.byCurrency[0].paymentCount).toBe(1);
  });

  it("separates collected from pending amounts per currency", async () => {
    collections.accounts.push({
      tenantId,
      membershipId: "bb000000-0000-4000-8000-000000000006",
      studentId: "bb000000-0000-4000-8000-000000000013",
      studentName: "Dana",
      planName: "Mensual",
      status: "active",
      expiresOn: "2026-08-30",
      nextBillingDate: "2026-08-31",
      expirationGraceDays: 0,
      currency: "USD",
      contractedAmount: 100,
      balance: 100,
    });

    const report = await getCollectionPeriodReport(
      { tenantId, period: "2026-09", onDate: "2026-09-10" },
      { payments, collections },
    );

    expect(report.byCurrency).toEqual([
      {
        currency: "CLP",
        collectedAmount: 25000,
        pendingAmount: 65000,
        paymentCount: 2,
      },
      {
        currency: "USD",
        collectedAmount: 0,
        pendingAmount: 100,
        paymentCount: 0,
      },
    ]);
  });
});
