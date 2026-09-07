import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QuickActionMenu } from "./quick-action-menu";

afterEach(cleanup);

describe("QuickActionMenu", () => {
  it("only offers usable actions for the current session", () => {
    render(<QuickActionMenu role="instructor" currentSessionId="session-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(
      screen.getByRole("menuitem", { name: "Abrir asistencia" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Ver agenda" })).toBeTruthy();
  });

  it("does not offer attendance when there is no current session", () => {
    render(<QuickActionMenu role="assistant" />);
    fireEvent.click(screen.getByRole("button", { name: "Acción rápida" }));

    expect(
      screen.queryByRole("menuitem", { name: "Abrir asistencia" }),
    ).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Ver agenda" })).toBeTruthy();
  });
});
