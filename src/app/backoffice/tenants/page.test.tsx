import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { TenantBackofficeSummary } from "@/domain/saas-administration/tenant-backoffice";
import TenantBackofficePage from "./page";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({
    shell: {},
    deps: {
      tenantBackoffice: {
        isPlatformAdmin: async () => true,
        listTenants: mocks.list,
      },
    },
  }),
}));
vi.mock("@/presentation/components/backoffice-shell", () => ({
  BackofficeShell: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));

const tenant: TenantBackofficeSummary = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "Academia",
  status: "active",
  createdAt: new Date("2026-01-01"),
  contactName: "Ana Principal",
  contactEmail: "principal@example.cl",
  phone: "+56 9 1234 5678",
  address: "Av. Central 123",
  city: "Santiago",
  region: "Metropolitana",
  billingContactName: "Pedro Facturación",
  billingContactEmail: "pagos@example.cl",
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([tenant]);
});

describe("Tenant backoffice list page", () => {
  it("renders the tenant name and contact email in the table", async () => {
    render(await TenantBackofficePage({ searchParams: Promise.resolve({}) }));
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Academia")).toBeTruthy();
    expect(table.getByText("principal@example.cl")).toBeTruthy();
  });

  it("falls back to contact name when email is absent", async () => {
    mocks.list.mockResolvedValue([{ ...tenant, contactEmail: null }]);
    render(await TenantBackofficePage({ searchParams: Promise.resolve({}) }));
    expect(
      within(screen.getByRole("table")).getByText("Ana Principal"),
    ).toBeTruthy();
    expect(
      within(
        screen.getByRole("list", { name: "Listado de tenants" }),
      ).getByText("Ana Principal"),
    ).toBeTruthy();
  });

  it("filters by query param", async () => {
    render(
      await TenantBackofficePage({
        searchParams: Promise.resolve({ q: "Academia" }),
      }),
    );
    expect(
      within(screen.getByRole("table")).getByText("Academia"),
    ).toBeTruthy();
  });

  it("shows empty state when no tenants match the filter", async () => {
    render(
      await TenantBackofficePage({
        searchParams: Promise.resolve({ q: "Inexistente" }),
      }),
    );
    expect(screen.getByText("No hay tenants para este filtro.")).toBeTruthy();
  });

  it("links each tenant to its dedicated management page", async () => {
    render(await TenantBackofficePage({ searchParams: Promise.resolve({}) }));
    const links = screen.getAllByRole("link", { name: "Gestionar Academia" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(
        `/backoffice/tenants/${tenant.id}`,
      );
    }
  });

  it("propagates database errors to the route boundary", async () => {
    mocks.list.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(
      TenantBackofficePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("Database unavailable");
  });
});
