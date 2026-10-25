import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  destinationsForRole,
  isDestinationActive,
  operationalDestinations,
  activeScheduleSection,
  scheduleSectionsForRole,
  moreDestinationsForRole,
  isDisciplinesActive,
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
beforeEach(() => {
  route.pathname = "/dashboard/students/student-1";
});

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
      // trainings is now visible to all roles; billing only to owner; gym to owner + admin.
      expect(destinationsForRole(role).map((item) => item.id)).toEqual([
        "home",
        "schedule",
        "students",
        "trainings",
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
    expect(
      screen
        .getByRole("link", { name: "Mi gimnasio" })
        .getAttribute("aria-current"),
    ).toBe("page");
    unmount();
    render(<DesktopNavigation role="instructor" />);
    expect(screen.queryByRole("link", { name: "Mi gimnasio" })).toBeNull();
  });

  it("shows Entrenamientos in mobile nav and uses Configuración group label on desktop", () => {
    render(
      <>
        <DesktopNavigation role="instructor" />
        <MobileNavigation
          role="instructor"
          quickAction={<button>Crear</button>}
        />
      </>,
    );

    // Alumnos should still be active (route = /dashboard/students/student-1)
    expect(
      screen
        .getAllByRole("link", { name: "Alumnos" })[0]
        .getAttribute("aria-current"),
    ).toBe("page");

    // Desktop sidebar uses the new group labels
    expect(screen.getByText("Operación")).toBeTruthy();
    expect(screen.getByText("Configuración")).toBeTruthy();

    // Reportes is not in mobile (mobile: false) — only one instance from sidebar
    expect(screen.getAllByRole("link", { name: "Reportes" })).toHaveLength(1);

    // Entrenamientos IS now in mobile — there should be two links (sidebar + bottom nav)
    expect(
      screen.getAllByRole("link", { name: "Entrenamientos" }),
    ).toHaveLength(2);

    // Finanzas is NOT in mobile bottom nav anymore — only in sidebar
    expect(screen.getAllByRole("link", { name: "Finanzas" })).toHaveLength(1);

    expect(screen.getByRole("button", { name: "Crear" })).toBeTruthy();
  });

  it("resolves schedule sections for route paths", () => {
    expect(activeScheduleSection("/dashboard/schedule")).toBe("sessions");
    expect(activeScheduleSection("/dashboard/schedule/programming")).toBe(
      "programming",
    );
    expect(activeScheduleSection("/dashboard/schedule/schedules")).toBe(
      "schedules",
    );
    expect(activeScheduleSection("/dashboard/disciplines")).toBeNull();
    expect(
      activeScheduleSection("/dashboard/sessions/session-1/attendance"),
    ).toBe("sessions");
    expect(activeScheduleSection("/dashboard/students")).toBeNull();

    const schedule = operationalDestinations.find(
      (item) => item.id === "schedule",
    )!;
    expect(isDestinationActive(schedule, "/dashboard/schedule")).toBe(true);
    expect(
      isDestinationActive(schedule, "/dashboard/schedule/programming"),
    ).toBe(true);
    expect(isDestinationActive(schedule, "/dashboard/schedule/schedules")).toBe(
      true,
    );
    expect(isDestinationActive(schedule, "/dashboard/disciplines")).toBe(false);
    expect(
      isDestinationActive(schedule, "/dashboard/sessions/session-1/attendance"),
    ).toBe(true);
  });

  it("marks gym as active when navigating disciplines", () => {
    expect(isDisciplinesActive("/dashboard/disciplines")).toBe(true);
    expect(isDisciplinesActive("/dashboard/gym")).toBe(false);

    const gym = operationalDestinations.find((item) => item.id === "gym")!;
    expect(isDestinationActive(gym, "/dashboard/disciplines")).toBe(true);
    expect(isDestinationActive(gym, "/dashboard/gym")).toBe(true);
  });

  it("limits scheduling links by role (disciplines removed from ScheduleNavigation)", () => {
    // Disciplines is no longer in the schedule submenu for any role.
    for (const role of ["owner", "admin", "instructor", "assistant"] as const) {
      expect(
        scheduleSectionsForRole(role).map((item) => item.id),
      ).not.toContain("disciplines");
    }
    // owner/admin/instructor see Horarios + Programar; assistant does not.
    for (const role of ["owner", "admin", "instructor"] as const) {
      expect(scheduleSectionsForRole(role).map((item) => item.id)).toEqual([
        "sessions",
        "schedules",
        "programming",
      ]);
    }
    expect(scheduleSectionsForRole("assistant").map((item) => item.id)).toEqual(
      ["sessions"],
    );

    render(<DesktopNavigation role="assistant" />);
    expect(screen.queryByRole("link", { name: "Programar" })).toBeNull();
  });

  it("keeps Sesiones active during attendance and selects its leaf on desktop", () => {
    route.pathname = "/dashboard/sessions/session-1/attendance";
    render(
      <>
        <DesktopNavigation role="instructor" />
        <MobileNavigation
          role="instructor"
          quickAction={<button>Crear</button>}
        />
      </>,
    );
    // "Sesiones" is the canonical label for the schedule destination.
    // It appears in sidebar + mobile bottom nav → two links.
    const sesionesLinks = screen.getAllByRole("link", { name: "Sesiones" });
    expect(sesionesLinks.length).toBeGreaterThanOrEqual(1);
    // At least one of those links should be aria-current="page".
    expect(
      sesionesLinks.some(
        (link) => link.getAttribute("aria-current") === "page",
      ),
    ).toBe(true);
    expect(
      screen
        .queryByRole("link", { name: "Programar" })
        ?.getAttribute("aria-current"),
    ).toBeNull();
  });

  it("selects programming in secondary navigation", () => {
    render(<ScheduleNavigation role="owner" activeSection="programming" />);
    expect(
      screen
        .getByRole("link", { name: "Programar" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Sesiones" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("moreDestinationsForRole includes non-mobile destinations only", () => {
    const instructorMore = moreDestinationsForRole("instructor").map(
      (d) => d.id,
    );
    // home, finance, reports are non-mobile for instructor
    expect(instructorMore).toContain("home");
    expect(instructorMore).toContain("finance");
    expect(instructorMore).toContain("reports");
    // trainings is mobile now — should NOT be in more
    expect(instructorMore).not.toContain("trainings");
    // gym is owner/admin only — not in instructor
    expect(instructorMore).not.toContain("gym");

    const ownerMore = moreDestinationsForRole("owner").map((d) => d.id);
    expect(ownerMore).toContain("gym");
    expect(ownerMore).toContain("billing");
  });
});
