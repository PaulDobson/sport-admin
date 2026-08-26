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
    expect(screen.getByRole("main").id).toBe("main-content");
    expect(
      screen.getByRole("complementary", { name: "Contexto operativo" }),
    ).toBeTruthy();
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
});
