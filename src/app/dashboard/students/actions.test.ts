import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveStudentAction, createStudentAction, updateStudentAction } from "./actions";
import { revalidatePath } from "next/cache";

const mocks = vi.hoisted(() => ({
  requireOperationalMembership: vi.fn(),
  createInstructorOperationsDeps: vi.fn(),
  createEvolutionHealthAttendanceDeps: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  archiveStudent: vi.fn(),
  getTenantHealthPolicy: vi.fn(),
  registerStudentHealthConsent: vi.fn(),
  createHealthCondition: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: mocks.requireOperationalMembership,
}));
vi.mock("@/infrastructure/composition/instructor-operations-composition", () => ({
  createInstructorOperationsDeps: mocks.createInstructorOperationsDeps,
}));
vi.mock(
  "@/infrastructure/composition/evolution-health-attendance-composition",
  () => ({
    createEvolutionHealthAttendanceDeps:
      mocks.createEvolutionHealthAttendanceDeps,
  }),
);
vi.mock("@/application/instructor-operations/use-cases/create-student", () => ({
  createStudent: mocks.createStudent,
}));
vi.mock("@/application/instructor-operations/use-cases/update-student", () => ({
  updateStudent: mocks.updateStudent,
}));
vi.mock("@/application/instructor-operations/use-cases/archive-student", () => ({
  archiveStudent: mocks.archiveStudent,
}));
vi.mock(
  "@/application/evolution-health-attendance/use-cases/manage-student-health",
  () => ({ createHealthCondition: mocks.createHealthCondition }),
);
vi.mock(
  "@/application/evolution-health-attendance/use-cases/manage-student-privacy",
  () => ({
    getTenantHealthPolicy: mocks.getTenantHealthPolicy,
    registerStudentHealthConsent: mocks.registerStudentHealthConsent,
  }),
);

afterEach(() => vi.clearAllMocks());

describe("createStudentAction", () => {
  it("archives within the current academy and revalidates list and detail", async () => {
    mocks.requireOperationalMembership.mockResolvedValue({ tenantId: "tenant-1", role: "instructor" });
    mocks.createInstructorOperationsDeps.mockResolvedValue({});
    mocks.archiveStudent.mockResolvedValue({});
    const form = new FormData();
    form.set("studentId", "student-1");
    expect(await archiveStudentAction({ error: null, saved: false }, form)).toEqual({ error: null, saved: true });
    expect(mocks.archiveStudent).toHaveBeenCalledWith({ tenantId: "tenant-1", studentId: "student-1" }, {});
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/students");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/students/student-1");
  });

  it("returns the existing result instead of creating twice after a partial save", async () => {
    mocks.requireOperationalMembership.mockResolvedValue({ tenantId: "tenant-1", role: "owner" });
    const result = await createStudentAction({ error: "Salud pendiente", saved: false, createdStudentId: "student-1" }, new FormData());
    expect(result.createdStudentId).toBe("student-1");
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it("communicates a health failure after creation with the created identifier", async () => {
    mocks.requireOperationalMembership.mockResolvedValue({ tenantId: "tenant-1", role: "owner" });
    mocks.createInstructorOperationsDeps.mockResolvedValue({});
    mocks.createEvolutionHealthAttendanceDeps.mockResolvedValue({});
    mocks.getTenantHealthPolicy.mockResolvedValue({ healthEnabled: true, policyVersion: "2026-01" });
    mocks.createStudent.mockResolvedValue({ student: { id: "student-1" }, contacts: [] });
    mocks.registerStudentHealthConsent.mockRejectedValueOnce(new Error("health unavailable"));
    const form = new FormData();
    form.set("fullName", "Ana");
    form.set("allergies", "Maní");
    form.set("representedConsentConfirmed", "confirmed");
    expect(await createStudentAction({ error: null, saved: false }, form)).toMatchObject({ saved: false, createdStudentId: "student-1", error: expect.stringContaining("ya fue creado") });
  });

  it.each([createStudentAction, updateStudentAction, archiveStudentAction])("rejects administrative mutations for assistants", async action => {
    mocks.requireOperationalMembership.mockResolvedValue({ tenantId: "tenant-1", role: "assistant" });
    const result = await action({ error: null, saved: false }, new FormData());
    expect(result).toMatchObject({ saved: false, error: expect.stringContaining("permiso") });
    expect(mocks.createStudent).not.toHaveBeenCalled();
    expect(mocks.updateStudent).not.toHaveBeenCalled();
    expect(mocks.archiveStudent).not.toHaveBeenCalled();
  });
  it("requires represented consent before creating a student with allergies", async () => {
    mocks.requireOperationalMembership.mockResolvedValue({
      id: "membership-1",
      tenantId: "tenant-1",
      role: "owner",
    });
    mocks.createInstructorOperationsDeps.mockResolvedValue({});
    const formData = new FormData();
    formData.set("fullName", "Maya Torres");
    formData.set("allergies", "Maní");

    const result = await createStudentAction(
      { error: null, saved: false },
      formData,
    );

    expect(result.error).toContain("consentimiento explícito");
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it("stores allergies through the consent-gated health history", async () => {
    mocks.requireOperationalMembership.mockResolvedValue({
      id: "membership-1",
      tenantId: "tenant-1",
      role: "owner",
    });
    mocks.createInstructorOperationsDeps.mockResolvedValue({});
    const health = { health: {}, privacy: {} };
    mocks.createEvolutionHealthAttendanceDeps.mockResolvedValue(health);
    mocks.getTenantHealthPolicy.mockResolvedValue({
      healthEnabled: true,
      policyVersion: "2026-01",
    });
    const student = { id: "student-1" };
    mocks.createStudent.mockResolvedValue({ student, contacts: [] });
    mocks.registerStudentHealthConsent.mockResolvedValue("consent-1");
    mocks.createHealthCondition.mockResolvedValue({});
    const formData = new FormData();
    formData.set("fullName", "Maya Torres");
    formData.set("allergies", "Maní");
    formData.set("representedConsentConfirmed", "confirmed");

    const result = await createStudentAction(
      { error: null, saved: false },
      formData,
    );

    expect(result).toEqual({ error: null, saved: true, createdStudentId: "student-1" });
    expect(mocks.createStudent).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Maya Torres" }),
      {},
    );
    expect(mocks.registerStudentHealthConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        studentId: student.id,
        policyVersion: "2026-01",
        decision: "granted",
        representedConsentConfirmed: true,
      }),
      health,
    );
    expect(mocks.createHealthCondition).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        studentId: student.id,
        name: "Alergias",
        notes: "Maní",
      }),
      health,
    );
  });

  it("does not create the student when the tenant health policy is disabled", async () => {
    mocks.requireOperationalMembership.mockResolvedValue({
      id: "membership-1",
      tenantId: "tenant-1",
      role: "owner",
    });
    mocks.createInstructorOperationsDeps.mockResolvedValue({});
    mocks.createEvolutionHealthAttendanceDeps.mockResolvedValue({});
    mocks.getTenantHealthPolicy.mockResolvedValue({ healthEnabled: false });
    const formData = new FormData();
    formData.set("fullName", "Maya Torres");
    formData.set("allergies", "Maní");
    formData.set("representedConsentConfirmed", "confirmed");

    const result = await createStudentAction(
      { error: null, saved: false },
      formData,
    );

    expect(result.error).toContain("política de salud");
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });
});
