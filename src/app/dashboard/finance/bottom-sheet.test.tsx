import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("escapes transformed catalog ancestors and restores scrolling and focus after dismissal", () => {
    const { container } = render(
      <section style={{ transform: "translateY(0)", overflow: "hidden" }}>
        <BottomSheet title="Editar plan" trigger="Editar">
          <input aria-label="Nombre" />
        </BottomSheet>
      </section>,
    );
    const trigger = screen.getByRole("button", { name: "Editar" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar panel" }));
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps keyboard focus inside the editor in both directions", () => {
    render(
      <BottomSheet title="Editar plan" trigger="Editar">
        <input aria-label="Nombre" />
        <button disabled>Guardar</button>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    const first = within(dialog).getByRole("textbox");
    const last = within(dialog).getByRole("button", { name: "Cerrar" });
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("supports a controlled panel without trigger and reports closing", () => {
    const onOpenChange = vi.fn();
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { rerender } = render(
      <BottomSheet
        title="Asignar plan"
        open
        onOpenChange={onOpenChange}
        variant="side"
      >
        <p>contenido</p>
      </BottomSheet>,
    );

    expect(screen.queryByRole("button", { name: "Asignar plan" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Asignar plan" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog")).toBeTruthy();

    rerender(
      <BottomSheet
        title="Asignar plan"
        open={false}
        onOpenChange={onOpenChange}
        variant="side"
      >
        <p>contenido</p>
      </BottomSheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
