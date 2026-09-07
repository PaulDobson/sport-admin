import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell, ProductMark } from "./app-shell";

afterEach(cleanup);

describe("AppShell", () => {
  it("renders stable navigation, content, and contextual regions", () => {
    render(
      <AppShell
        sidebarHeader={<ProductMark context="Box Norte" />}
        navigation={<a href="/dashboard">Inicio</a>}
        mobileNavigation={<a href="/dashboard">Inicio móvil</a>}
        topbar={<span>Jornada</span>}
        context={<p>Sesión actual</p>}
      >
        <h1>Panel operativo</h1>
      </AppShell>,
    );

    expect(
      screen.getByRole("complementary", { name: "Navegación principal" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Navegación móvil" }),
    ).toBeTruthy();
    const main = screen.getByRole("main");
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Navegación móvil",
    });
    expect(main.id).toBe("main-content");
    expect(main.className).toContain("--bottom-nav-height");
    expect(mobileNavigation.className).toContain("--safe-area-bottom");
    expect(
      screen.getByRole("complementary", { name: "Contexto operativo" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Saltar al contenido" })
        .getAttribute("href"),
    ).toBe("#main-content");
  });

  it("omits the context rail when no contextual content exists", () => {
    render(
      <AppShell
        sidebarHeader={<ProductMark />}
        navigation="Navegación"
        mobileNavigation="Navegación móvil"
        topbar="Topbar"
      >
        Contenido
      </AppShell>,
    );

    expect(
      screen.queryByRole("complementary", { name: "Contexto operativo" }),
    ).toBeNull();
  });

  it("renders topbar actions for account and tenant controls", () => {
    render(
      <AppShell
        sidebarHeader={<ProductMark context="Box Norte" />}
        navigation={<a href="/dashboard">Inicio</a>}
        mobileNavigation={<a href="/dashboard">Inicio móvil</a>}
        topbar={<span>Jornada</span>}
        topbarActions={
          <>
            <button type="button">Seleccionar tenant</button>
            <button type="button">Cuenta</button>
          </>
        }
      >
        <h1>Panel operativo</h1>
      </AppShell>,
    );

    expect(
      screen.getByRole("button", { name: "Seleccionar tenant" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cuenta" })).toBeTruthy();
  });
});
