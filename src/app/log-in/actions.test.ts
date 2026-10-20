import { beforeEach,describe,expect,it,vi } from "vitest";
import { logInAction } from "./actions";
const m = vi.hoisted(() => ({ signIn: vi.fn(),user: vi.fn(),active: vi.fn(),operational: vi.fn(),admin: vi.fn(),students: vi.fn() }));
vi.mock("@/application/auth/use-cases/sign-in",() => ({ signIn: m.signIn }));
vi.mock("@/infrastructure/composition/auth-composition",() => ({ createAuthDeps: async () => ({
  auth: { getCurrentUserId: m.user },memberships: { findActiveByUser: m.active,findOperationalByUser: m.operational },
}) }));
vi.mock("@/infrastructure/composition/saas-administration-composition",() => ({ createSaasAdministrationDeps: async () => ({ tenantBackoffice: { isPlatformAdmin: m.admin } }) }));
vi.mock("@/infrastructure/composition/student-portal-composition",() => ({ createStudentPortalDeps: async () => ({ portal: { listMyStudents: m.students } }) }));
vi.mock("next/navigation",() => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
const login = (next = "") => {
  const form = new FormData(); form.set("email","user@example.invalid"); form.set("password","test-password"); form.set("next",next);
  return logInAction({ error: null },form);
};
beforeEach(() => {
  vi.resetAllMocks(); m.user.mockResolvedValue("user"); m.active.mockResolvedValue([]); m.operational.mockResolvedValue([]);
  m.admin.mockResolvedValue(false); m.students.mockResolvedValue([]);
});
describe("billing login destination",() => {
  it.each(["/billing","/billing?tenant=academy-1&page=2"])("preserves explicit billing navigation %s after successful authentication",async (next) => {
    await expect(login(next)).rejects.toThrow(`REDIRECT:${next}`); expect(m.signIn).toHaveBeenCalledOnce();
  });
  it("routes suspended owners without operational memberships to the standalone read model",async () => {
    m.active.mockResolvedValue([{ role: "owner" }]); await expect(login()).rejects.toThrow("REDIRECT:/billing");
  });
  it.each(["owner","admin","instructor","assistant"])("retains normal operational login for %s",async (role) => {
    m.active.mockResolvedValue([{ role }]); m.operational.mockResolvedValue([{ role }]);
    await expect(login()).rejects.toThrow("REDIRECT:/dashboard");
  });
  it("does not use an untrusted billing-like open redirect",async () => {
    await expect(login("https://foreign.example/billing")).rejects.toThrow("REDIRECT:/onboarding");
  });
  it("preserves existing platform-admin and student portal routes",async () => {
    m.admin.mockResolvedValue(true); await expect(login()).rejects.toThrow("REDIRECT:/backoffice");
    m.students.mockResolvedValue([{ id: "student" }]); await expect(login()).rejects.toThrow("REDIRECT:/portal");
  });
});
