import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishPlanAction } from "./actions";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), publish: vi.fn(), user: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({ auth: { getCurrentUserId: mocks.user } }),
}));
vi.mock("@/infrastructure/composition/saas-administration-composition", () => ({
  createSaasAdministrationDeps: async () => ({ planCatalog: { isPlatformAdmin: mocks.admin, publish: mocks.publish } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const initial = { error: null, saved: false, fieldErrors: {} };
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    operationId: "ad430000-0000-4000-8000-000000000001",
    name: "Academia", price: "11900", durationUnit: "months", durationCount: "3",
    trialDays: "0", maxStudents: "100", maxUsers: "5", services: "Soporte\nCapacitación",
    reason: "Oferta inicial",
  })) data.set(key, value);
  data.append("features", "reports");
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue("admin");
  mocks.admin.mockResolvedValue(true);
  mocks.publish.mockResolvedValue({ planId: "plan", versionId: "version", versionNumber: 1 });
});

describe("plan publication action", () => {
  it("normalizes numeric terms and services and revalidates only after confirmation", async () => {
    expect(await publishPlanAction(initial, form())).toMatchObject({ saved: true, error: null });
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({
      planId: null, expectedVersionId: null,
      terms: expect.objectContaining({ price: 11900, durationCount: 3, services: ["Soporte", "Capacitación"] }),
    }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/backoffice/plans");
  });
  it.each(["", "11900.5", "-1"])("does not turn invalid price %j into a free plan", async (price) => {
    const data = form();
    data.set("price", price);
    const result = await publishPlanAction(initial, data);
    expect(result.saved).toBe(false);
    expect(result.fieldErrors["terms.price"]).toBeTruthy();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("enforces admin permission even for direct action calls", async () => {
    mocks.admin.mockResolvedValue(false);
    expect(await publishPlanAction(initial, form())).toMatchObject({ saved: false, error: expect.stringContaining("administrador") });
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("logs unexpected backend failure and does not claim successful persistence", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.publish.mockRejectedValueOnce(new Error("offline"));
    expect((await publishPlanAction(initial, form())).saved).toBe(false);
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
