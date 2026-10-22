import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickActionMenu } from "./quick-action-menu";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/students",
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("QuickActionMenu", () => {
  it("always shows Tomar asistencia for roles that can take attendance", () => {
    // Previously this action depended on currentSessionId being passed (it never was).
    // Now it always navigates to the sessions list where the instructor selects a session.
    for (const role of ["owner", "admin", "instructor", "assistant"] as const) {
      const { unmount } = render(<QuickActionMenu role={role} />);
      fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

      const attendanceLink = screen.getByRole("menuitem", {
        name: "Tomar asistencia",
      });
      expect(attendanceLink).toBeTruthy();
      expect(attendanceLink.getAttribute("href")).toBe("/dashboard/schedule");
      unmount();
    }
  });

  it("shows student management actions to all roles except assistant", () => {
    render(<QuickActionMenu role="instructor" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(
      screen
        .getByRole("menuitem", { name: "Nuevo alumno" })
        .getAttribute("href"),
    ).toBe("/dashboard/students/new");
    expect(screen.getByRole("menuitem", { name: "Asignar plan" })).toBeTruthy();
  });

  it("hides student management actions for assistants", () => {
    render(<QuickActionMenu role="assistant" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(screen.queryByRole("menuitem", { name: "Nuevo alumno" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Asignar plan" })).toBeNull();
  });

  it("always shows Ver sesiones as a fallback action", () => {
    render(<QuickActionMenu role="assistant" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(screen.getByRole("menuitem", { name: "Ver sesiones" })).toBeTruthy();
  });

  it("opens plan assignment over the current page keeping its filters", () => {
    window.history.replaceState(null, "", "/dashboard/students?search=Ana");
    render(<QuickActionMenu role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    fireEvent.click(screen.getByRole("menuitem", { name: "Asignar plan" }));

    expect(push).toHaveBeenCalledWith(
      "/dashboard/students?search=Ana&assign=1",
      { scroll: false },
    );
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not offer plan assignment to assistants", () => {
    render(<QuickActionMenu role="assistant" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(screen.queryByRole("menuitem", { name: "Asignar plan" })).toBeNull();
  });
});
