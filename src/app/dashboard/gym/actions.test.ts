import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantMembership } from "@/domain/tenants/tenant-membership";
import { updateGymAction } from "./actions";

const mocks = vi.hoisted(() => ({ context: vi.fn(), update: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/app/_lib/operational-context", () => ({ loadOperationalContext: mocks.context }));
vi.mock("@/infrastructure/composition/tenant-details-composition", () => ({ createTenantDetailsDeps: async () => ({ update: mocks.update }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

const membership: TenantMembership = { id: "membership", tenantId: "tenant-a", userId: "user", role: "owner", status: "active", createdAt: new Date() };
const previous = { error: null, saved: false };
function form() {
  const data = new FormData();
  data.set("tenantId", "tenant-a");
  data.set("name", "Academia");
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({ status: "ready", membership });
});

describe("updateGymAction", () => {
  it("saves the active tenant and refreshes every name surface", async () => {
    const result = await updateGymAction(previous, form());
    expect(result.saved).toBe(true);
    expect(result.details?.tenantId).toBe("tenant-a");
    expect(mocks.revalidate.mock.calls).toEqual([["/dashboard", "layout"], ["/select-tenant"], ["/backoffice/tenants"]]);
  });
  it("rejects a forged tenant or a context switched in another tab", async () => {
    const data = form();
    data.set("tenantId", "tenant-b");
    expect((await updateGymAction(previous, data)).error).toMatch(/Cambiaste de gimnasio/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(["unauthenticated", "selection-required", "no-operational-tenant"])("does not save when context is %s", async status => {
    mocks.context.mockResolvedValue({ status });
    expect((await updateGymAction(previous, form())).saved).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("enforces role permissions on direct action calls", async () => {
    mocks.context.mockResolvedValue({ status: "ready", membership: { ...membership, role: "instructor" } });
    expect((await updateGymAction(previous, form())).error).toMatch(/Solo el dueño/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("returns field-level errors without persisting", async () => {
    const data = form();
    data.set("name", " ");
    data.set("contactEmail", "invalid");
    const result = await updateGymAction(previous, data);
    expect(result.fieldErrors?.name).toBeTruthy();
    expect(result.fieldErrors?.contactEmail).toBe("Ingresa un email de contacto válido.");
    expect(result.saved).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("logs unexpected storage failures and does not revalidate", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.update.mockRejectedValue(new Error("offline"));
    expect(await updateGymAction(previous, form())).toMatchObject({ saved: false, error: expect.stringContaining("No pudimos guardar") });
    expect(log).toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
