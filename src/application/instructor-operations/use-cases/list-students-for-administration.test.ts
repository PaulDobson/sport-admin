import { describe, expect, it } from "vitest";
import { createStudent } from "./create-student";
import { archiveStudent } from "./archive-student";
import { listStudentsForAdministration } from "./list-students-for-administration";
import { FakeStudentRepository } from "../testing/fakes";

const tenantId = "10000000-0000-4000-8000-000000000001";
const otherTenantId = "10000000-0000-4000-8000-000000000002";

describe("listStudentsForAdministration", () => {
  it("returns tenant-scoped paginated active students with primary contact data", async () => {
    const students = new FakeStudentRepository();
    await createStudent(
      {
        tenantId,
        fullName: "Bea Bravo",
        contacts: [{ type: "phone", value: "+56 9 1111", isPrimary: true }],
      },
      { students },
    );
    await createStudent({ tenantId, fullName: "Ana Alvarez" }, { students });
    await createStudent({ tenantId, fullName: "Carla Cruz" }, { students });
    await createStudent(
      { tenantId: otherTenantId, fullName: "Bea Other" },
      { students },
    );

    const result = await listStudentsForAdministration(
      { tenantId, page: 1, pageSize: 2, search: "bea" },
      { students },
    );

    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 2 });
    expect(result.rows).toEqual([
      expect.objectContaining({
        fullName: "Bea Bravo",
        tenantId,
        primaryContact: expect.objectContaining({ value: "+56 9 1111" }),
      }),
    ]);
  });

  it("excludes archived students by default and can include them explicitly", async () => {
    const students = new FakeStudentRepository();
    const { student } = await createStudent(
      { tenantId, fullName: "Diego Diaz" },
      { students },
    );
    await archiveStudent({ tenantId, studentId: student.id }, { students });

    await expect(
      listStudentsForAdministration({ tenantId }, { students }),
    ).resolves.toMatchObject({ total: 0, rows: [] });
    await expect(
      listStudentsForAdministration(
        { tenantId, status: "archived" },
        { students },
      ),
    ).resolves.toMatchObject({
      total: 1,
      rows: [expect.objectContaining({ status: "archived" })],
    });
  });
});
