import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BottomSheet } from "./bottom-sheet";

afterEach(cleanup);

describe("bottom sheet", () => {
  it("exposes the trigger state to assistive technology", () => {
    render(
      <BottomSheet title="Cobrar" trigger="Cobrar">
        <p>contenido</p>
      </BottomSheet>,
    );

    const trigger = screen.getByRole("button", { name: "Cobrar" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");

    fireEvent.click(trigger);
    expect(
      screen
        .getByRole("button", { name: "Cobrar" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("labels the dialog and moves focus into it", () => {
    render(
      <BottomSheet title="Cobrar a Ana" trigger="Cobrar">
        <p>contenido</p>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cobrar" }));
    const dialog = screen.getByRole("dialog", { name: "Cobrar a Ana" });
    expect(document.activeElement).toBe(dialog);
  });

  it("closes with Escape and returns focus to the trigger", () => {
    render(
      <BottomSheet title="Cobrar" trigger="Cobrar">
        <p>contenido</p>
      </BottomSheet>,
    );

    const trigger = screen.getByRole("button", { name: "Cobrar" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cobrar" }),
    );
  });

  it("closes from the explicit close action", () => {
    render(
      <BottomSheet title="Cobrar" trigger="Cobrar">
        <p>contenido</p>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cobrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
