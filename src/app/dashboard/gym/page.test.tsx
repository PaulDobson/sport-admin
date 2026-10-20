import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GymPage from "./page";

const mocks = vi.hoisted(() => ({ membership: vi.fn(), composition: vi.fn(), find: vi.fn() }));
vi.mock("@/app/_lib/operational-context", () => ({ requireOperationalMembership: mocks.membership }));
vi.mock("@/infrastructure/composition/tenant-details-composition", () => ({ createTenantDetailsDeps: mocks.composition }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("./actions", () => ({ updateGymAction: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.membership.mockResolvedValue({ tenantId: "trusted-tenant", role: "owner", status: "active" });
  mocks.composition.mockResolvedValue({ findByTenantId: mocks.find });
  mocks.find.mockResolvedValue({ tenantId: "trusted-tenant", name: "Academia", address: null, contactName: null, contactEmail: null, phone: null, city: null, region: null });
});

describe("GymPage", () => {
  it.each(["owner", "admin"])("loads the authenticated academy for %s", async role => {
    mocks.membership.mockResolvedValue({ tenantId: "trusted-tenant", role, status: "active" });
    render(await GymPage());
    expect(mocks.find).toHaveBeenCalledWith("trusted-tenant");
    expect(screen.getByRole("heading", { name: "Datos del gimnasio" })).toBeTruthy();
  });
  it.each(["instructor", "assistant"])("redirects %s before reading contact data", async role => {
    mocks.membership.mockResolvedValue({ tenantId: "trusted-tenant", role, status: "active" });
    await expect(GymPage()).rejects.toThrow("redirect:/dashboard");
    expect(mocks.composition).not.toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("propagates load failures to the dashboard error boundary", async () => {
    mocks.find.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(GymPage()).rejects.toThrow("Database unavailable");
  });
});
