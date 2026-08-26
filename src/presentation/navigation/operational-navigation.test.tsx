import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  destinationsForRole,
  isDestinationActive,
  operationalDestinations,
} from "./operational-navigation";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/students/student-1",
}));

afterEach(cleanup);

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

  it("provides functional destinations for every operational role", () => {
    expect(destinationsForRole("assistant").map((item) => item.id)).toEqual([
      "home",
      "schedule",
      "students",
      "finance",
      "reports",
    ]);
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
    expect(screen.getAllByRole("link", { name: "Reportes" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Crear" })).toBeTruthy();
  });
});
