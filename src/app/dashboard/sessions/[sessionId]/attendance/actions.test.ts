import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchAttendanceStudentsAction } from "./actions";
import { searchAttendanceStudents } from "@/application/evolution-health-attendance/use-cases/search-attendance-students";
import { requireOperationalMembership } from "@/app/_lib/operational-context";

vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: vi.fn() }));
vi.mock("@/infrastructure/composition/evolution-health-attendance-composition", () => ({ createEvolutionHealthAttendanceDeps: async () => ({ attendance: {} }) }));
vi.mock("@/application/evolution-health-attendance/use-cases/search-attendance-students", () => ({ searchAttendanceStudents: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const initial = { error: null, students: [], page: 1, total: 0, search: "", searched: false };
const membership: Awaited<ReturnType<typeof requireOperationalMembership>> = {
  id: "member-1", tenantId: "tenant-1", role: "instructor", userId: "user-1", status: "active", createdAt: new Date(),
};
beforeEach(() => { vi.clearAllMocks(); vi.mocked(requireOperationalMembership).mockResolvedValue(membership); });
describe("attendance search action", () => {
  it("uses the authenticated academy and exposes only identifiers and names", async () => {
    vi.mocked(searchAttendanceStudents).mockResolvedValue({ students: [{ studentId: "student-1", studentName: "Ana" }], total: 201 });
    const form = new FormData();
    form.set("tenantId", "wrong-tenant"); form.set("search", " Ana "); form.set("page", "2");
    const result = await searchAttendanceStudentsAction(initial, form);
    expect(searchAttendanceStudents).toHaveBeenCalledWith({ tenantId: "tenant-1", search: "Ana", page: 2 }, { attendance: {} });
    expect(result).toEqual({ error: null, students: [{ studentId: "student-1", studentName: "Ana" }], total: 201, page: 2, search: "Ana", searched: true });
  });
  it("surfaces search failures", async () => {
    vi.mocked(searchAttendanceStudents).mockRejectedValue(new Error("Unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await searchAttendanceStudentsAction(initial, new FormData())).error).toBeTruthy();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
