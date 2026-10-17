import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/domain/shared/errors";
import { SupabaseMembershipRepository } from "./supabase-membership-repository";
import { SupabasePaymentRepository } from "./supabase-payment-repository";

type Call = [string, ...unknown[]];

function queryBuilder(result: { data: unknown; error: unknown }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "in",
    "not",
    "order",
    "limit",
    "lte",
    "gte",
  ]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.maybeSingle = () => {
    calls.push(["maybeSingle"]);
    return Promise.resolve(result);
  };
  builder.single = () => {
    calls.push(["single"]);
    return Promise.resolve(result);
  };
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return { builder, calls };
}

const membershipRow = {
  id: "membership-1",
  tenant_id: "tenant-1",
  student_id: "student-1",
  plan_id: "plan-1",
  starts_at: "2026-05-01",
  expires_at: "2026-05-31",
  next_billing_date: "2026-06-01",
  agreed_price: "30000",
  currency: "CLP",
  billing_cycle: "monthly",
  status: "active",
  past_due_since: null,
  paused_at: null,
  cancelled_at: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  membership_plans: { expiration_grace_days: 5 },
};

describe("SupabasePaymentRepository.listRecentMovements", () => {
  it("reads paid payments of the tenant with student and plan names", async () => {
    const { builder, calls } = queryBuilder({
      data: [
        {
          id: "payment-1",
          membership_id: "membership-1",
          amount: "15000",
          currency: "CLP",
          status: "paid",
          paid_at: "2026-05-10T12:00:00Z",
          student_memberships: {
            student_id: "student-1",
            students: { full_name: "Ana Bravo" },
            membership_plans: { name: "Plan Full" },
          },
        },
      ],
      error: null,
    });
    const from = vi.fn(() => builder);
    const repository = new SupabasePaymentRepository({
      from,
    } as unknown as SupabaseClient);

    await expect(
      repository.listRecentMovements("tenant-1", 8),
    ).resolves.toEqual([
      {
        id: "payment-1",
        membershipId: "membership-1",
        studentId: "student-1",
        studentName: "Ana Bravo",
        planName: "Plan Full",
        amount: 15000,
        currency: "CLP",
        status: "paid",
        paidAt: new Date("2026-05-10T12:00:00Z"),
      },
    ]);
    expect(from).toHaveBeenCalledWith("student_membership_payments");
    expect(calls).toContainEqual(["eq", "tenant_id", "tenant-1"]);
    expect(calls).toContainEqual(["eq", "status", "paid"]);
    expect(calls).toContainEqual(["limit", 8]);
  });
});

describe("SupabaseMembershipRepository read helpers", () => {
  it("lists students with active, paused or past-due memberships of the tenant", async () => {
    const { builder, calls } = queryBuilder({
      data: [
        { student_id: "student-1" },
        { student_id: "student-1" },
        { student_id: "student-2" },
      ],
      error: null,
    });
    const repository = new SupabaseMembershipRepository({
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient);

    await expect(
      repository.findStudentIdsWithCurrentMembership("tenant-1", [
        "student-1",
        "student-2",
        "student-3",
      ]),
    ).resolves.toEqual(["student-1", "student-2"]);
    expect(calls).toContainEqual(["eq", "tenant_id", "tenant-1"]);
    expect(calls).toContainEqual([
      "in",
      "status",
      ["active", "paused", "past_due"],
    ]);
    expect(calls).toContainEqual([
      "in",
      "student_id",
      ["student-1", "student-2", "student-3"],
    ]);
  });

  it("skips the query for an empty student list", async () => {
    const from = vi.fn();
    const repository = new SupabaseMembershipRepository({
      from,
    } as unknown as SupabaseClient);
    await expect(
      repository.findStudentIdsWithCurrentMembership("tenant-1", []),
    ).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("finds the membership activated by an operation id of the tenant", async () => {
    const events = queryBuilder({
      data: { entity_id: "membership-1" },
      error: null,
    });
    const memberships = queryBuilder({ data: membershipRow, error: null });
    const from = vi.fn((table: string) =>
      table === "instructor_financial_events"
        ? events.builder
        : memberships.builder,
    );
    const repository = new SupabaseMembershipRepository({
      from,
    } as unknown as SupabaseClient);

    const result = await repository.findByActivationOperation(
      "tenant-1",
      "operation-1",
    );
    expect(result?.id).toBe("membership-1");
    expect(events.calls).toContainEqual(["eq", "tenant_id", "tenant-1"]);
    expect(events.calls).toContainEqual(["eq", "operation_id", "operation-1"]);
    expect(events.calls).toContainEqual([
      "eq",
      "event_type",
      "membership_activated",
    ]);
  });

  it("returns null when the operation was never applied", async () => {
    const events = queryBuilder({ data: null, error: null });
    const repository = new SupabaseMembershipRepository({
      from: vi.fn(() => events.builder),
    } as unknown as SupabaseClient);
    await expect(
      repository.findByActivationOperation("tenant-1", "operation-1"),
    ).resolves.toBeNull();
  });

  it("maps unique violations on activation to a conflict", async () => {
    const repository = new SupabaseMembershipRepository({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      }),
    } as unknown as SupabaseClient);
    await expect(
      repository.create({
        tenantId: "tenant-1",
        studentId: "student-1",
        planId: "plan-1",
        startsOn: "2026-05-01",
        actorMembershipId: "actor-1",
        operationId: "operation-1",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
