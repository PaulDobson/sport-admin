import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileMaintenancePanels } from "./profile-maintenance-panels";

afterEach(cleanup);

describe("ProfileMaintenancePanels", () => {
  it("renders maintenance categories without fake preference controls", () => {
    render(
      <ProfileMaintenancePanels
        organizationName="Box Norte"
        roleLabel="Dueña"
      />,
    );

    expect(
      screen.getByRole("complementary", { name: "Mantenimiento de cuenta" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Organización" })).toBeTruthy();
    expect(screen.getByText("Rol operativo: Dueña")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Cambiar contraseña" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Notificaciones" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Preferencias" })).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
