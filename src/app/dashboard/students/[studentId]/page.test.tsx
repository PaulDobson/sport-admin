import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentDetailPage from "./page";
import NewStudentPage from "../new/page";
import StudentEditPage from "./edit/page";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  find: vi.fn(),
  health: vi.fn(),
  privacy: vi.fn(),
  history: vi.fn(),
  finance: vi.fn(),
  memberships: vi.fn(),
  balance: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); }, redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: mocks.membership }));
vi.mock("@/infrastructure/composition/instructor-operations-composition", () => ({ createInstructorOperationsDeps: async () => ({ students: { findAdministrationRowById: mocks.find } }) }));
vi.mock("@/infrastructure/composition/evolution-health-attendance-composition", () => ({ createEvolutionHealthAttendanceDeps: mocks.health }));
vi.mock("@/infrastructure/composition/instructor-finance-composition", () => ({ createInstructorFinanceDeps: mocks.finance }));
vi.mock("@/application/evolution-health-attendance/use-cases/manage-student-privacy", () => ({ getStudentPrivacyState: mocks.privacy }));
vi.mock("@/application/evolution-health-attendance/use-cases/manage-student-health", () => ({ getStudentHealthHistory: mocks.history }));
vi.mock("@/application/instructor-finance/use-cases/manage-membership", () => ({ listCurrentMemberships: mocks.memberships }));
vi.mock("@/application/instructor-finance/use-cases/manage-payment", () => ({ getMembershipBalance: mocks.balance }));
vi.mock("./student-portal-invite-button", () => ({ StudentPortalInviteButton: () => <button>Generar invitación</button> }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ role: "owner", tenantId: "tenant-1" });
  mocks.find.mockResolvedValue({ id: "student-1", fullName: "Ana Bravo", status: "active", birthDate: null, photoUrl: null, gender: null, heightCm: null, weightKg: null, contactPhone: "+56 9 1234", contactEmail: "ana@example.com", emergencyContactName: "Maya", emergencyContactEmail: null, emergencyContactPhone: null });
  mocks.health.mockResolvedValue({});
  mocks.privacy.mockResolvedValue({ healthEnabled: true, hasCurrentConsent: true, policyVersion: "2026-01", erasureRequest: null });
  mocks.history.mockResolvedValue({ conditions: [{ id: "allergy-1", name: "Alergias", status: "active", notes: "Maní" }], restrictions: [], injuries: [] });
  mocks.finance.mockResolvedValue({ memberships: { findActivePlans: async () => [] } });
  mocks.memberships.mockResolvedValue([{ id: "membership-1", status: "past_due", agreedPrice: 10000, currency: "CLP", nextBillingDate: "2026-11-01" }]);
  mocks.balance.mockResolvedValue({ balance: 10000 });
});
const params = Promise.resolve({ studentId: "student-1" });

describe("student task pages", () => {
  it("identifies the student, contacts, state and return context without loading other sections", async () => {
    render(await StudentDetailPage({ params, searchParams: Promise.resolve({ search: "Ana", page: "2" }) }));
    expect(screen.getByRole("heading", { name: "Ana Bravo" })).toBeTruthy();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a alumnos" }).getAttribute("href")).toContain("search=Ana&status=active&page=2");
    expect(mocks.health).not.toHaveBeenCalled();
    expect(mocks.finance).not.toHaveBeenCalled();
    expect(mocks.find).toHaveBeenCalledWith("tenant-1", "student-1");
  });
  it("hides sensitive navigation and mutations from assistants even with a section URL", async () => {
    mocks.membership.mockResolvedValue({ role: "assistant", tenantId: "tenant-1" });
    render(await StudentDetailPage({ params, searchParams: Promise.resolve({ section: "health" }) }));
    expect(screen.queryByRole("link", { name: "Salud" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Editar alumno" })).toBeNull();
    expect(screen.queryByText("Maya")).toBeNull();
    expect(mocks.health).not.toHaveBeenCalled();
  });
  it.each([false, true])("never fetches protected history when policy/consent blocks it (policy=%s)", async healthEnabled => {
    mocks.privacy.mockResolvedValue({ healthEnabled, hasCurrentConsent: false });
    render(await StudentDetailPage({ params, searchParams: Promise.resolve({ section: "health" }) }));
    expect(screen.getByText("Datos de salud bloqueados")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Guardar alerta" })).toBeNull();
    expect(mocks.history).not.toHaveBeenCalled();
  });
  it("preserves authorized alerts and financial actions in their own sections", async () => {
    render(await StudentDetailPage({ params, searchParams: Promise.resolve({ section: "health" }) }));
    expect(screen.getByText("Maní")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar alerta" })).toBeTruthy();
    cleanup();
    render(await StudentDetailPage({ params, searchParams: Promise.resolve({ section: "membership" }) }));
    expect(screen.getByText("En mora")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Registrar cobro" }).getAttribute("href")).toBe("/dashboard/finance?section=collections");
  });
  it("preserves all privacy actions and communicates archive separately", async () => {
    render(await StudentDetailPage({ params, searchParams: Promise.resolve({ section: "privacy" }) }));
    expect(screen.getByRole("button", { name: "Revocar consentimiento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Corregir datos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Solicitar eliminación" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Exportar datos personales" })).toBeTruthy();
    expect(screen.getByText(/distinto de archivar/)).toBeTruthy();
  });
  it("does not offer repeat archive for archived students", async () => {
    mocks.find.mockResolvedValue({ ...(await mocks.find()), status: "archived" });
    render(await StudentDetailPage({ params, searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Archivado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Archivar Ana Bravo" })).toBeNull();
  });
  it("authorizes creation/edit routes and preserves return query", async () => {
    mocks.membership.mockResolvedValue({ role: "assistant", tenantId: "tenant-1" });
    const searchParams = Promise.resolve({ search: "Ana", page: "2" });
    await expect(NewStudentPage({ searchParams })).rejects.toThrow("redirect:/dashboard/students?search=Ana&status=active&page=2&pageSize=10");
    await expect(StudentEditPage({ params, searchParams })).rejects.toThrow("redirect:/dashboard/students");
    mocks.membership.mockResolvedValue({ role: "owner", tenantId: "tenant-1" });
    render(await NewStudentPage({ searchParams }));
    expect(screen.getByRole("link", { name: "Cancelar" }).getAttribute("href")).toContain("search=Ana&status=active&page=2");
    cleanup();
    render(await StudentEditPage({ params, searchParams }));
    expect((screen.getByLabelText("Nombre completo") as HTMLInputElement).value).toBe("Ana Bravo");
    expect(screen.getByRole("link", { name: "Cancelar" }).getAttribute("href")).toContain("/students/student-1?search=Ana");
  });
});
