import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BackofficeShell } from "./backoffice-shell";

afterEach(cleanup);

describe("BackofficeShell", () => {
  it("keeps platform navigation separate and identifies the active area", () => {
    render(
      <BackofficeShell title="Tenants" current="tenants">
        <p>Contenido de plataforma</p>
      </BackofficeShell>,
    );

    expect(screen.getByText("Backoffice")).toBeTruthy();
    expect(screen.getByText("Administración SaaS")).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Secciones de plataforma" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Tenants" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.queryByRole("link", { name: "Operación" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Volver a operación" }),
    ).toBeNull();
    expect(
      screen.getAllByRole("link", { name: "Perfil" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });

  it("shows operation links when the user also has an operational tenant", () => {
    render(
      <BackofficeShell
        title="Tenants"
        current="tenants"
        canAccessOperation={true}
      >
        <p>Contenido de plataforma</p>
      </BackofficeShell>,
    );

    expect(screen.getByRole("link", { name: "Operación" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Volver a operación" }),
    ).toBeTruthy();
  });
});
