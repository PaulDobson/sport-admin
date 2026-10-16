import type { StudentAdministrationRow, StudentAdministrationQuery } from "../../src/application/instructor-operations/ports/student-repository-port";

const tenantId = "10000000-0000-4000-8000-000000000001";
export const student: StudentAdministrationRow = {
  id: "20000000-0000-4000-8000-000000000001", tenantId,
  fullName: "Ana Bravo Fernández de la Academia Deportiva",
  photoUrl: null, birthDate: "2001-04-12", gender: "female",
  heightCm: 170, weightKg: 65, emergencyContactName: "Maya Bravo",
  emergencyContactEmail: "maya.bravo@example.com", emergencyContactPhone: "+56 9 1234 5678",
  status: "active", createdAt: new Date("2026-09-01"), archivedAt: null,
  contactEmail: "ana.bravo.contacto.extraordinariamente.largo@example.com", contactPhone: "+56 9 1111 2222",
};
const rows = [student, { ...student, id: "20000000-0000-4000-8000-000000000002", fullName: "Beatriz".repeat(12), status: "archived" as const }];
export async function requireOperationalMembership() {
  return { id: "membership-1", tenantId, role: new URLSearchParams(location.search).get("role") === "assistant" ? "assistant" : "instructor" };
}
export async function createInstructorOperationsDeps() {
  return { students: {
    async listForAdministration(query: StudentAdministrationQuery) {
      const filtered = rows.filter(row => (query.status === "all" || row.status === query.status) && (!query.search || row.fullName.toLowerCase().includes(query.search.toLowerCase())));
      return { rows: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize };
    },
    async findAdministrationRowById(_tenantId: string, id: string) { return rows.find(row => row.id === id) ?? null; },
  } };
}
export function notFound(): never { throw new Error("Student fixture not found"); }
export function redirect(path: string): never { location.replace(path); throw new Error(`Fixture redirect: ${path}`); }
export async function createInstructorFinanceDeps() {
  return { memberships: { findActivePlans: async () => [{ id: "plan-1", name: "Mensual", price: 10000, currency: "CLP" }] } };
}
export async function listCurrentMemberships() { return []; }
export async function getMembershipBalance() { return { balance: 0 }; }
export async function createEvolutionHealthAttendanceDeps() { return {}; }
export async function getStudentPrivacyState() {
  return { healthEnabled: true, hasCurrentConsent: new URLSearchParams(location.search).get("consent") !== "no", policyVersion: "2026-01", jurisdictionCode: "CL", erasureRequest: null };
}
export async function getStudentHealthHistory() { return { conditions: [], injuries: [], restrictions: [] }; }
export async function createStudentAction() {
  await new Promise(resolve => setTimeout(resolve, 150));
  return { error: "Error de prueba: revisa los datos.", saved: false };
}
export async function updateStudentAction() { return { error: null, saved: true }; }
export async function archiveStudentAction() { return { error: "Error de prueba: no se pudo archivar.", saved: false }; }
export async function activateMembershipAction() { return { error: null, saved: true }; }
export async function createRestrictionAction() { return { error: null, saved: true }; }
export async function registerConsentAction() { return { error: null, saved: true }; }
export async function correctPersonalDataAction() { return { error: null, saved: true }; }
export async function requestErasureAction() { return { error: null, saved: true }; }
export async function createStudentPortalInviteAction() {
  return { error: "Error de prueba: invitación no disponible.", inviteUrl: null, email: null, expiresAt: null };
}
