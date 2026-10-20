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
  it("only offers usable actions for the current session", () => {
    render(<QuickActionMenu role="instructor" currentSessionId="session-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(
      screen.getByRole("menuitem", { name: "Abrir asistencia" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Ver agenda" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Nuevo alumno" }).getAttribute("href")).toBe("/dashboard/students/new");
  });

  it("does not offer attendance when there is no current session", () => {
    render(<QuickActionMenu role="assistant" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(
      screen.queryByRole("menuitem", { name: "Abrir asistencia" }),
    ).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Ver agenda" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Nuevo alumno" })).toBeNull();
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
