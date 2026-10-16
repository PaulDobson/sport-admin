import { describe, expect, it, vi } from "vitest";
import { searchAttendanceStudents } from "./search-attendance-students";

const tenantId = "c84d5db9-bc46-4f45-aa31-d16e77327c01";
describe("attendance search validation", () => {
  it("passes a trimmed query and bounded page to the search adapter", async () => {
    const searchStudents = vi.fn().mockResolvedValue({ students: [], total: 0 });
    await searchAttendanceStudents({ tenantId, search: " José Soto ", page: 2 }, { attendance: { searchStudents } });
    expect(searchStudents).toHaveBeenCalledWith(tenantId, "José Soto", 2);
  });
  it.each(["", "a", "x".repeat(101)])("rejects invalid search length before querying", async (search) => {
    const searchStudents = vi.fn();
    await expect(searchAttendanceStudents({ tenantId, search, page: 1 }, { attendance: { searchStudents } })).rejects.toThrow();
    expect(searchStudents).not.toHaveBeenCalled();
  });
});
