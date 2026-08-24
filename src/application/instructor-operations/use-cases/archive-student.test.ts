import { describe, expect, it } from "vitest";
import { archiveStudent } from "./archive-student";
import { createStudent } from "./create-student";
import { FakeStudentRepository } from "../testing/fakes";

const tenantId = "10000000-0000-4000-8000-000000000001";

describe("archiveStudent", () => {
  it("preserves the student and excludes it from active results", async () => {
    const students = new FakeStudentRepository();
    const { student } = await createStudent(
      { tenantId, fullName: "Ada Lovelace" },
      { students },
    );

    const archived = await archiveStudent(
      { tenantId, studentId: student.id },
      { students },
    );

    expect(archived.status).toBe("archived");
    expect(archived.archivedAt).toBeInstanceOf(Date);
    await expect(students.findActiveByTenant(tenantId)).resolves.toEqual([]);
    expect(students.students).toHaveLength(1);
  });
});
