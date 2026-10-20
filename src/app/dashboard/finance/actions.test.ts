import { afterEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/domain/shared/errors";
import {
  assignMembershipAction,
  listAssignablePlansAction,
  searchAssignableStudentsAction,
} from "./actions";
import { collectionOperationId } from "./operation-id";

const membership = vi.hoisted(() => vi.fn());
const createFinanceDeps = vi.hoisted(() => vi.fn());
const createOperationsDeps = vi.hoisted(() => vi.fn());
const assignMembership = vi.hoisted(() => vi.fn());
const listMembershipPlans = vi.hoisted(() => vi.fn());
const getMembershipBalance = vi.hoisted(() => vi.fn());
const listStudents = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: membership,
}));
vi.mock("@/infrastructure/composition/instructor-finance-composition", () => ({
  createInstructorFinanceDeps: createFinanceDeps,
}));
vi.mock(
  "@/infrastructure/composition/instructor-operations-composition",
  () => ({ createInstructorOperationsDeps: createOperationsDeps }),
);
vi.mock(
  "@/application/instructor-finance/use-cases/manage-membership",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    assignMembership,
    listMembershipPlans,
  }),
);
vi.mock(
  "@/application/instructor-finance/use-cases/manage-payment",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getMembershipBalance,
  }),
);
vi.mock(
  "@/application/instructor-operations/use-cases/list-students-for-administration",
  () => ({ listStudentsForAdministration: listStudents }),
);
vi.mock("next/cache", () => ({ revalidatePath }));

const tenantId = "11111111-1111-4111-8111-111111111111";
const owner = { id: "member-1", role: "owner", tenantId };
const findStudentIdsWithCurrentMembership = vi.fn();

afterEach(() => vi.clearAllMocks());

function assignmentForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    studentId: "student-1",
    planId: "plan-1",
    startsOn: "2026-03-01",
    assignmentToken: "22222222-2222-4222-8222-222222222222",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

const createdMembership = {
  id: "membership-1",
  studentId: "student-1",
  expiresOn: "2026-03-31",
  agreedPrice: 30000,
  currency: "CLP",
};

describe("assignment actions authorization", () => {
  it("rejects assistants before loading finance dependencies", async () => {
    membership.mockResolvedValue({ ...owner, role: "assistant" });

    const state = await assignMembershipAction(
      { status: "idle", error: null },
      assignmentForm(),
    );
    expect(state.status).toBe("error");
    await expect(searchAssignableStudentsAction("ana")).resolves.toEqual([]);
    await expect(listAssignablePlansAction()).resolves.toEqual([]);
    expect(createFinanceDeps).not.toHaveBeenCalled();
    expect(createOperationsDeps).not.toHaveBeenCalled();
    expect(assignMembership).not.toHaveBeenCalled();
  });
});

describe("searchAssignableStudentsAction", () => {
  it("flags students that already have a current membership", async () => {
    membership.mockResolvedValue(owner);
    createOperationsDeps.mockResolvedValue({ students: {} });
    createFinanceDeps.mockResolvedValue({
      memberships: { findStudentIdsWithCurrentMembership },
    });
    listStudents.mockResolvedValue({
      rows: [
        { id: "student-1", fullName: "Ana Pérez", photoUrl: null },
        { id: "student-2", fullName: "Andrés Soto", photoUrl: "/a.png" },
      ],
      total: 2,
      page: 1,
      pageSize: 8,
    });
    findStudentIdsWithCurrentMembership.mockResolvedValue(["student-2"]);

    const students = await searchAssignableStudentsAction("an");

    expect(listStudents).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, search: "an", status: "active" }),
      { students: {} },
    );
    expect(findStudentIdsWithCurrentMembership).toHaveBeenCalledWith(
      tenantId,
      ["student-1", "student-2"],
    );
    expect(students).toEqual([
      {
        id: "student-1",
        fullName: "Ana Pérez",
        photoUrl: null,
        hasCurrentMembership: false,
      },
      {
        id: "student-2",
        fullName: "Andrés Soto",
        photoUrl: "/a.png",
        hasCurrentMembership: true,
      },
    ]);
  });
});

describe("assignMembershipAction", () => {
  it("assigns without payment and reports the pending balance", async () => {
    membership.mockResolvedValue(owner);
    createFinanceDeps.mockResolvedValue({});
    assignMembership.mockResolvedValue({
      membership: createdMembership,
      payment: null,
      paymentError: null,
    });
    getMembershipBalance.mockResolvedValue({ paidAmount: 0, balance: 30000 });

    const state = await assignMembershipAction(
      { status: "idle", error: null },
      assignmentForm(),
    );

    expect(assignMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        studentId: "student-1",
        planId: "plan-1",
        startsOn: "2026-03-01",
        actorMembershipId: "member-1",
        assignmentToken: "22222222-2222-4222-8222-222222222222",
        initialPayment: undefined,
      }),
      {},
    );
    expect(state).toEqual({
      status: "assigned",
      error: null,
      result: {
        membershipId: "membership-1",
        studentId: "student-1",
        expiresOn: "2026-03-31",
        agreedPrice: 30000,
        currency: "CLP",
        paidAmount: 0,
        balance: 30000,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/finance");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/dashboard/students/student-1",
    );
  });

  it("derives a stable payment operation from the assignment token", async () => {
    membership.mockResolvedValue(owner);
    createFinanceDeps.mockResolvedValue({});
    assignMembership.mockResolvedValue({
      membership: createdMembership,
      payment: { amount: 30000 },
      paymentError: null,
    });
    getMembershipBalance.mockResolvedValue({ paidAmount: 30000, balance: 0 });

    const state = await assignMembershipAction(
      { status: "idle", error: null },
      assignmentForm({
        withPayment: "on",
        amount: "30000",
        method: "transfer",
        paidOn: "2026-03-01",
        reference: " TRX-1 ",
      }),
    );

    expect(assignMembership.mock.calls[0][0].initialPayment).toEqual({
      amount: 30000,
      method: "transfer",
      paidAt: new Date("2026-03-01T12:00:00Z"),
      reference: "TRX-1",
      operationId: collectionOperationId([
        tenantId,
        "22222222-2222-4222-8222-222222222222",
        "initial-payment",
      ]),
    });
    expect(state.status).toBe("assigned");
    expect(state.result?.balance).toBe(0);
  });

  it("keeps the membership when the initial payment fails", async () => {
    membership.mockResolvedValue(owner);
    createFinanceDeps.mockResolvedValue({});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    assignMembership.mockResolvedValue({
      membership: createdMembership,
      payment: null,
      paymentError: new Error("network"),
    });
    getMembershipBalance.mockRejectedValue(new Error("offline"));

    const state = await assignMembershipAction(
      { status: "idle", error: null },
      assignmentForm({ withPayment: "on", amount: "30000" }),
    );

    expect(state.status).toBe("payment_failed");
    expect(state.error).toMatch(/membresía quedó creada/);
    expect(state.result).toMatchObject({ paidAmount: 0, balance: 30000 });
    consoleError.mockRestore();
  });

  it("explains a conflicting current membership", async () => {
    membership.mockResolvedValue(owner);
    createFinanceDeps.mockResolvedValue({});
    assignMembership.mockRejectedValue(new ConflictError("duplicate"));

    const state = await assignMembershipAction(
      { status: "idle", error: null },
      assignmentForm(),
    );

    expect(state).toEqual({
      status: "error",
      error: expect.stringMatching(/ya tiene una membresía vigente/),
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
