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

  it("accepts optional athlete profile and emergency contact details", async () => {
    const students = new FakeStudentRepository();
    const result = await createStudent(
      {
        tenantId,
        fullName: "  Maya Torres  ",
        gender: "female",
        heightCm: "164.5",
        weightKg: "58.2",
        emergencyContactName: "  Alex Torres  ",
        emergencyContactEmail: "alex@example.com",
        emergencyContactPhone: "+56 9 1234 5678",
      },
      { students },
    );

    expect(result.student).toMatchObject({
      fullName: "Maya Torres",
      gender: "female",
      heightCm: 164.5,
      weightKg: 58.2,
      emergencyContactName: "Alex Torres",
      emergencyContactEmail: "alex@example.com",
      emergencyContactPhone: "+56 9 1234 5678",
    });
  });

  it("rejects out-of-range athlete measurements", async () => {
    const students = new FakeStudentRepository();

    await expect(
      createStudent(
        { tenantId, fullName: "Maya Torres", heightCm: "-1" },
        { students },
      ),
    ).rejects.toThrow();
  });
});
