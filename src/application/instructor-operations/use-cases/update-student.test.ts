import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { createStudent } from "./create-student";
import { updateStudent } from "./update-student";
import { FakeStudentRepository } from "../testing/fakes";

const tenantId = "10000000-0000-4000-8000-000000000001";

describe("updateStudent", () => {
  it("updates the student profile and both contact fields", async () => {
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
        photoUrl: "https://example.com/ana.jpg",
        gender: "female",
        heightCm: "164",
        weightKg: "58.2",
        emergencyContactName: "  Alex Bravo ",
        emergencyContactEmail: "alex@example.com",
        emergencyContactPhone: "+56 9 1234 5678",
        contactEmail: " ana@example.com ",
        contactPhone: "+56 9 8765 4321 ",
      },
      { students },
    );

    expect(result.student).toMatchObject({
      fullName: "Ana Bravo",
      birthDate: "1994-04-10",
      photoUrl: "https://example.com/ana.jpg",
      gender: "female",
      heightCm: 164,
      weightKg: 58.2,
      emergencyContactName: "Alex Bravo",
      emergencyContactEmail: "alex@example.com",
      emergencyContactPhone: "+56 9 1234 5678",
    });
    expect(result.contacts).toEqual([
      expect.objectContaining({
        type: "email",
        label: null,
        value: "ana@example.com",
        isPrimary: true,
      }),
      expect.objectContaining({
        type: "phone",
        label: null,
        value: "+56 9 8765 4321",
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
          photoUrl: null,
          gender: null,
          heightCm: null,
          weightKg: null,
          emergencyContactName: null,
          emergencyContactEmail: null,
          emergencyContactPhone: null,
          contactEmail: null,
          contactPhone: null,
        },
        { students },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
