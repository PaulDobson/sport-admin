import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { createStudent } from "./create-student";
import { updateStudent } from "./update-student";
import { FakeStudentRepository } from "../testing/fakes";

const tenantId = "10000000-0000-4000-8000-000000000001";

describe("updateStudent", () => {
  it("updates basic student data and replaces the primary contact", async () => {
    const students = new FakeStudentRepository();
    const { student } = await createStudent(
      {
        tenantId,
        fullName: "Ana Alvarez",
        contacts: [{ type: "phone", value: "111", isPrimary: true }],
      },
      { students },
    );

    const result = await updateStudent(
      {
        tenantId,
        studentId: student.id,
        fullName: "  Ana Bravo  ",
        birthDate: "1994-04-10",
        primaryContact: {
          type: "email",
          label: "Personal",
          value: " ana@example.com ",
        },
      },
      { students },
    );

    expect(result.student).toMatchObject({
      fullName: "Ana Bravo",
      birthDate: "1994-04-10",
    });
    expect(result.contacts).toEqual([
      expect.objectContaining({
        type: "email",
        label: "Personal",
        value: "ana@example.com",
        isPrimary: true,
      }),
    ]);
  });

  it("rejects invalid student updates", async () => {
    const students = new FakeStudentRepository();

    await expect(
      updateStudent(
        {
          tenantId,
          studentId: "student-1",
          fullName: " ",
          birthDate: null,
          primaryContact: null,
        },
        { students },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
