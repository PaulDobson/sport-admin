import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountContextMenu } from "./account-context-menu";

vi.mock("@/app/select-tenant/actions", () => ({
  selectTenantAction: vi.fn(),
}));

afterEach(cleanup);

describe("AccountContextMenu", () => {
  it("opens with account and authorized tenant options", () => {
    render(
      <AccountContextMenu
        profileName="Ana Silva"
        currentTenantId="tenant-1"
        roleLabel="Dueña"
        tenants={[
          { id: "tenant-1", name: "Box Norte" },
          { id: "tenant-2", name: "Box Centro" },
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Cuenta de Ana Silva" }),
    );

    expect(screen.getByRole("menu", { name: "Menú de cuenta" })).toBeTruthy();
    expect(screen.getByText("Dueña")).toBeTruthy();
    expect(screen.getAllByText("Box Norte")).toHaveLength(2);
    expect(
      screen.getByRole("menuitem", { name: /Box Norte.*Activo/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Perfil y cuenta" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Cerrar sesión" }),
    ).toBeTruthy();
  });

  it("closes on Escape and restores focus to the trigger", () => {
    render(
      <AccountContextMenu
        profileName="Ana Silva"
        currentTenantId="tenant-1"
        roleLabel="Dueña"
        tenants={[{ id: "tenant-1", name: "Box Norte" }]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Cuenta de Ana Silva" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu", { name: "Menú de cuenta" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the user presses outside the menu", () => {
    render(
      <AccountContextMenu
        profileName="Ana Silva"
        currentTenantId="tenant-1"
        roleLabel="Dueña"
        tenants={[{ id: "tenant-1", name: "Box Norte" }]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Cuenta de Ana Silva" }),
    );
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu", { name: "Menú de cuenta" })).toBeNull();
  });
});
