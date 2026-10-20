import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  destinationsForRole,
  isDestinationActive,
  operationalDestinations,
  activeScheduleSection,
  scheduleSectionsForRole,
} from "./operational-navigation";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import { ScheduleNavigation } from "@/presentation/components/schedule-navigation";

const route = vi.hoisted(() => ({ pathname: "/dashboard/students/student-1" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

afterEach(cleanup);
beforeEach(() => { route.pathname = "/dashboard/students/student-1"; });

describe("operational navigation", () => {
  it("matches nested routes without marking home active", () => {
    const home = operationalDestinations.find((item) => item.id === "home")!;
    const students = operationalDestinations.find(
      (item) => item.id === "students",
    )!;
    expect(isDestinationActive(home, "/dashboard/students")).toBe(false);
    expect(isDestinationActive(students, "/dashboard/students/student-1")).toBe(
      true,
    );
  });

  it("provides role-allowed functional destinations for every operational role", () => {
    const roles: TenantMembershipRole[] = [
      "owner",
      "admin",
      "instructor",
      "assistant",
    ];

    for (const role of roles) {
      expect(destinationsForRole(role).map((item) => item.id)).toEqual([
        "home",
        "schedule",
        "students",
        "finance",
        "reports",
        ...(["owner", "admin"].includes(role) ? ["gym"] : []),
        ...(role === "owner" ? ["billing"] : []),
      ]);
    }
  });

  it("shows academy maintenance only to owners and admins", () => {
    route.pathname = "/dashboard/gym";
    const { unmount } = render(<DesktopNavigation role="owner" />);
    expect(screen.getByRole("link", { name: "Mi gimnasio" }).getAttribute("aria-current")).toBe("page");
    unmount();
    render(<DesktopNavigation role="instructor" />);
    expect(screen.queryByRole("link", { name: "Mi gimnasio" })).toBeNull();
  });

  it("shares active state while keeping reports out of mobile navigation", () => {
    render(
      <>
        <DesktopNavigation role="instructor" />
        <MobileNavigation
          role="instructor"
          quickAction={<button>Crear</button>}
        />
      </>,
    );

    expect(
      screen
        .getAllByRole("link", { name: "Alumnos" })[0]
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByText("Operación")).toBeTruthy();
    expect(screen.getByText("Gestión")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Reportes" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Crear" })).toBeTruthy();
  });

  it.each([
    ["/dashboard/schedule", "sessions"],
    ["/dashboard/schedule/programming", "programming"],
    ["/dashboard/disciplines", "disciplines"],
    ["/dashboard/sessions/session-1/attendance", "sessions"],
    ["/dashboard/students", null],
    ["/dashboard/sessions-other", null],
  ])("resolves Agenda leaf for %s", (pathname, section) => {
    expect(activeScheduleSection(pathname)).toBe(section);
    const schedule = operationalDestinations.find((item) => item.id === "schedule")!;
    expect(isDestinationActive(schedule, pathname)).toBe(section !== null);
  });

  it("limits scheduling links by role", () => {
    for (const role of ["owner", "admin", "instructor"] as const) {
      expect(scheduleSectionsForRole(role).map((item) => item.id)).toEqual(["sessions", "programming", "disciplines"]);
    }
    expect(scheduleSectionsForRole("assistant").map((item) => item.id)).toEqual(["sessions", "disciplines"]);
    render(<><DesktopNavigation role="assistant" /><ScheduleNavigation role="assistant" activeSection="sessions" /></>);
    expect(screen.queryByRole("link", { name: "Programación" })).toBeNull();
  });

  it("keeps Agenda active during attendance and selects only its leaf on desktop", () => {
    route.pathname = "/dashboard/sessions/session-1/attendance";
    render(<><DesktopNavigation role="instructor" /><MobileNavigation role="instructor" quickAction={<button>Crear</button>} /></>);
    expect(screen.getByRole("link", { name: "Sesiones" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getAllByRole("link", { name: "Agenda" }).map((link) => link.getAttribute("aria-current"))).toEqual([null, "page"]);
    expect(screen.getByRole("link", { name: "Programación" }).getAttribute("aria-current")).toBeNull();
  });

  it("selects programming in secondary navigation", () => {
    render(<ScheduleNavigation role="owner" activeSection="programming" />);
    expect(screen.getByRole("link", { name: "Programación" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Sesiones" }).getAttribute("aria-current")).toBeNull();
  });
});
