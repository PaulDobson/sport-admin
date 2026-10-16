import { afterEach, describe, expect, it, vi } from "vitest";
import { activateMembershipAction, correctPersonalDataAction, createRestrictionAction, registerConsentAction, requestErasureAction } from "./actions";

const membership = vi.hoisted(() => vi.fn());
const createHealthDeps = vi.hoisted(() => vi.fn());
const createFinanceDeps = vi.hoisted(() => vi.fn());
vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: membership }));
vi.mock("@/infrastructure/composition/evolution-health-attendance-composition", () => ({ createEvolutionHealthAttendanceDeps: createHealthDeps }));
vi.mock("@/infrastructure/composition/instructor-finance-composition", () => ({ createInstructorFinanceDeps: createFinanceDeps }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
afterEach(() => vi.clearAllMocks());

describe("student sensitive actions authorization", () => {
  it.each([activateMembershipAction, correctPersonalDataAction, createRestrictionAction, registerConsentAction, requestErasureAction])("rejects direct assistant requests before loading protected dependencies", async action => {
    membership.mockResolvedValue({ role: "assistant", tenantId: "tenant-1" });
    await expect(action({ error: null, saved: false }, new FormData())).rejects.toThrow("redirect:/dashboard/students");
    expect(createHealthDeps).not.toHaveBeenCalled();
    expect(createFinanceDeps).not.toHaveBeenCalled();
  });
});
