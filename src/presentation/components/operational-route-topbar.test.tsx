import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationalRouteTopbar } from "./operational-route-topbar";

const route = vi.hoisted(() => ({ pathname: "/dashboard/schedule" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("./operational-topbar", () => ({
  OperationalTopbar: ({ title, section, actions }: { title: string; section: string; actions?: React.ReactNode }) => (
    <header><p>{section}</p><h1>{title}</h1>{actions}</header>
  ),
}));
afterEach(cleanup);

describe("Agenda route headings", () => {
  it("recognizes the static creation route before the detail route", () => {
    route.pathname = "/dashboard/students/new";
    render(<OperationalRouteTopbar tenantName="Academia Norte" account={{ profileName: "Ana", currentTenantId: "tenant-1", tenants: [], roleLabel: "Instructor" }} />);
    expect(screen.getByRole("heading", { name: "Nuevo alumno" })).toBeTruthy();
  });
  it.each([
    ["/dashboard/schedule", "Sesiones"],
    ["/dashboard/schedule/programming", "Programación de sesiones"],
    ["/dashboard/disciplines", "Administración de disciplinas"],
    ["/dashboard/sessions/session-1/attendance", "Tomar asistencia"],
  ])("labels %s consistently", (pathname, title) => {
    route.pathname = pathname;
    render(<OperationalRouteTopbar tenantName="Academia Norte" account={{
      profileName: "Ana", currentTenantId: "tenant-1", tenants: [], roleLabel: "Instructor",
    }} />);
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(/Agenda/)).toBeTruthy();
    if (pathname.includes("/attendance")) {
      expect(screen.getByRole("link", { name: "Volver a sesiones" }).getAttribute("href")).toBe("/dashboard/schedule");
    }
  });
});
