import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveIssuerAction } from "./actions";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), save: vi.fn(), user: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({ auth: { getCurrentUserId: mocks.user } }),
}));
vi.mock("@/infrastructure/composition/saas-administration-composition", () => ({
  createSaasAdministrationDeps: async () => ({ billingIssuer: { isPlatformAdmin: mocks.admin, save: mocks.save } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); } }));
const initial = { issuer: null, error: null, fieldErrors: {} };
const form = () => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ operationId: "ad480000-0000-4000-8000-000000000001",
    legalName: " Plataforma ", taxId: "12.345.678-5", address: " Calle 1 ", email: "issuer@example.invalid", reason: "Configurar emisor" })) data.set(key, value);
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue("user");
  mocks.admin.mockResolvedValue(true);
  mocks.save.mockResolvedValue({ id: "issuer", versionNumber: 1 });
});
describe("issuer action", () => {
  it("normalizes values and revalidates only confirmed writes", async () => {
    expect(await saveIssuerAction(initial, form())).toMatchObject({ error: null, issuer: { id: "issuer" } });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ legalName: "Plataforma", taxId: "12345678-5", expectedVersionId: null }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/backoffice/finance/issuer");
  });
  it("maps field errors without writing", async () => {
    const data = form(); data.set("taxId", "12345678-0");
    expect((await saveIssuerAction(initial, data)).fieldErrors.taxId).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("enforces platform admin for direct calls", async () => {
    mocks.admin.mockResolvedValue(false);
    expect(await saveIssuerAction(initial, form())).toMatchObject({ issuer: null, error: expect.stringContaining("administrador") });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("redirects anonymous actors without creating administration dependencies", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(saveIssuerAction(initial, form())).rejects.toThrow("REDIRECT");
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("logs unexpected errors without claiming success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.save.mockRejectedValueOnce(new Error("offline"));
    expect(await saveIssuerAction(initial, form())).toMatchObject({ issuer: null, error: expect.any(String) });
    expect(log).toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
