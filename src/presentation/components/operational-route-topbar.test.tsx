import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationalRouteTopbar } from "./operational-route-topbar";

const route = vi.hoisted(() => ({ pathname: "/dashboard/schedule" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("./operational-topbar", () => ({
  OperationalTopbar: ({
    title,
    section,
    actions,
  }: {
    title: string;
    section: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <p>{section}</p>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}));
afterEach(cleanup);

describe("Agenda route headings", () => {
  it("places gym maintenance under Configuración rather than personal profile", () => {
    route.pathname = "/dashboard/gym";
    render(
      <OperationalRouteTopbar
        tenantName="Academia"
        account={{
          profileName: "Ana",
          currentTenantId: "tenant-1",
          tenants: [],
          roleLabel: "Dueña",
          canManageGym: true,
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Mi gimnasio" })).toBeTruthy();
    expect(screen.getByText("Configuración")).toBeTruthy();
  });

  it("places disciplines under Configuración · Mi gimnasio", () => {
    route.pathname = "/dashboard/disciplines";
    render(
      <OperationalRouteTopbar
        tenantName="Academia"
        account={{
          profileName: "Ana",
          currentTenantId: "tenant-1",
          tenants: [],
          roleLabel: "Dueña",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Disciplinas" })).toBeTruthy();
    expect(screen.getByText("Configuración · Mi gimnasio")).toBeTruthy();
  });

  it("recognizes the static creation route before the detail route", () => {
    route.pathname = "/dashboard/students/new";
    render(
      <OperationalRouteTopbar
        tenantName="Academia Norte"
        account={{
          profileName: "Ana",
          currentTenantId: "tenant-1",
          tenants: [],
          roleLabel: "Instructor",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Nuevo alumno" })).toBeTruthy();
  });

  it.each([
    ["/dashboard/schedule", "Sesiones", "Sesiones"],
    ["/dashboard/schedule/programming", "Sesiones", "Programación de sesiones"],
    [
      "/dashboard/sessions/session-1/attendance",
      "Sesiones",
      "Tomar asistencia",
    ],
  ])("labels %s with section=%s and title=%s", (pathname, section, title) => {
    route.pathname = pathname;
    render(
      <OperationalRouteTopbar
        tenantName="Academia Norte"
        account={{
          profileName: "Ana",
          currentTenantId: "tenant-1",
          tenants: [],
          roleLabel: "Instructor",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    // Use getAllByText in case section and title text are identical (e.g. "Sesiones")
    expect(screen.getAllByText(section).length).toBeGreaterThanOrEqual(1);
    if (pathname.includes("/attendance")) {
      expect(
        screen.getByRole("link", { name: "← Sesiones" }).getAttribute("href"),
      ).toBe("/dashboard/schedule");
    }
  });

  it.each([
    ["/dashboard/finance", "Finanzas", "Resumen financiero"],
    ["/dashboard/finance/collections", "Finanzas", "Cobros"],
    ["/dashboard/finance/plans", "Finanzas", "Mantención de planes"],
  ])("labels %s with section=%s and title=%s", (pathname, section, title) => {
    route.pathname = pathname;
    render(
      <OperationalRouteTopbar
        tenantName="Academia Norte"
        account={{
          profileName: "Ana",
          currentTenantId: "tenant-1",
          tenants: [],
          roleLabel: "Dueña",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getAllByText(section).length).toBeGreaterThanOrEqual(1);
  });
});
