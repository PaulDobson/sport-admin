import { describe, expect, it } from "vitest";
import { createStudent } from "./create-student";
import { FakeStudentRepository } from "../testing/fakes";

const tenantId = "10000000-0000-4000-8000-000000000001";

describe("createStudent", () => {
  it("creates an active tenant-scoped student with contacts", async () => {
    const students = new FakeStudentRepository();

    const result = await createStudent(
      {
        tenantId,
        fullName: "  Ada Lovelace  ",
        contacts: [
          {
            type: "email",
            label: "Personal",
            value: " ada@example.com ",
            isPrimary: true,
          },
        ],
      },
      { students },
    );

    expect(result.student).toMatchObject({
      tenantId,
      fullName: "Ada Lovelace",
      status: "active",
    });
    expect(result.contacts).toEqual([
      expect.objectContaining({
        tenantId,
        studentId: result.student.id,
        value: "ada@example.com",
      }),
    ]);
  });
});
