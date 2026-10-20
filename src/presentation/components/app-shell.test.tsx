import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell, ProductMark } from "./app-shell";
import { DesktopNavigation, MobileNavigation } from "./primary-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/disciplines",
}));

afterEach(cleanup);

function renderOperationalShell(role: "owner" | "assistant" = "owner") {
  return render(
    <AppShell
      sidebarHeader={<ProductMark context="Dueño" />}
      navigation={<DesktopNavigation role={role} />}
      mobileNavigation={<MobileNavigation role={role} quickAction={<button>Crear</button>} />}
      topbar={<span>Jornada</span>}
    >
      <h1>Panel operativo</h1>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("renders stable navigation and content regions", () => {
    render(
      <AppShell
        sidebarHeader={<ProductMark context="Box Norte" />}
        navigation={<a href="/dashboard">Inicio</a>}
        mobileNavigation={<a href="/dashboard">Inicio móvil</a>}
        topbar={<span>Jornada</span>}
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
      screen
        .getByRole("link", { name: "Saltar al contenido" })
        .getAttribute("href"),
    ).toBe("#main-content");
  });

  it("starts expanded and connects the desktop control to its sidebar", () => {
    renderOperationalShell();
    const toggle = screen.getByRole("button", { name: "Colapsar navegación" });
    const sidebar = screen.getByRole("complementary", { name: "Navegación principal" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(sidebar.id);
    expect(toggle.className).toContain("hidden");
    expect(toggle.className).toContain("lg:flex");
    expect(sidebar.className).toContain("w-[var(--sidebar-width)]");
  });

  it("collapses and expands without removing destinations or changing mobile navigation", () => {
    renderOperationalShell();
    const sidebar = screen.getByRole("complementary", { name: "Navegación principal" });
    const navigation = within(sidebar).getByRole("navigation", { name: "Secciones" });
    const initialLinks = within(navigation).getAllByRole("link").map((link) => ({
      name: link.getAttribute("aria-label"),
      href: link.getAttribute("href"),
    }));
    const mobile = screen.getByRole("navigation", { name: "Navegación móvil" });
    const mobileMarkup = mobile.innerHTML;

    fireEvent.click(screen.getByRole("button", { name: "Colapsar navegación" }));

    const expand = screen.getByRole("button", { name: "Expandir navegación" });
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expect(sidebar.className).toContain("w-20");
    expect(screen.getByRole("main").parentElement?.className).toContain("lg:pl-20");
    expect(within(navigation).getAllByRole("link").map((link) => ({
      name: link.getAttribute("aria-label"),
      href: link.getAttribute("href"),
    }))).toEqual(initialLinks);
    expect(within(navigation).getByRole("link", { name: "Disciplinas" }).getAttribute("aria-current")).toBe("page");
    for (const label of ["Sesiones", "Programación", "Disciplinas"]) {
      const link = within(navigation).getByRole("link", { name: label });
      expect(link.querySelector("svg")).toBeTruthy();
      expect(within(link).getByText(label).className).toBe("sr-only");
    }
    expect(mobile.innerHTML).toBe(mobileMarkup);
    expect(sidebar.className).toContain("motion-reduce:transition-none");

    fireEvent.click(expand);

    expect(sidebar.className).toContain("w-[var(--sidebar-width)]");
    expect(screen.getByRole("main").parentElement?.className).toContain("lg:pl-[var(--sidebar-width)]");
    expect(within(navigation).getByText("Disciplinas").className).not.toBe("sr-only");
  });

  it("shows a compact link's label on keyboard focus", async () => {
    renderOperationalShell();
    fireEvent.click(screen.getByRole("button", { name: "Colapsar navegación" }));
    const sidebar = screen.getByRole("complementary", { name: "Navegación principal" });
    const link = within(sidebar).getByRole("link", { name: "Disciplinas" });
    act(() => link.focus());
    expect((await screen.findByRole("tooltip")).textContent).toBe("Disciplinas");
  });

  it("preserves role restrictions in compact mode", () => {
    renderOperationalShell("assistant");
    fireEvent.click(screen.getByRole("button", { name: "Colapsar navegación" }));
    const sidebar = screen.getByRole("complementary", { name: "Navegación principal" });
    expect(within(sidebar).queryByRole("link", { name: "Programación" })).toBeNull();
    expect(within(sidebar).getByRole("link", { name: "Disciplinas" })).toBeTruthy();
  });

  it("toggles the Agenda submenu while keeping the parent link", () => {
    renderOperationalShell();
    const sidebar = screen.getByRole("complementary", { name: "Navegación principal" });
    const toggle = within(sidebar).getByRole("button", { name: "Ocultar submenú de Agenda" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(sidebar).getByRole("link", { name: "Sesiones" })).toBeTruthy();

    fireEvent.click(toggle);

    const show = within(sidebar).getByRole("button", { name: "Mostrar submenú de Agenda" });
    expect(show.getAttribute("aria-expanded")).toBe("false");
    expect(within(sidebar).queryByRole("link", { name: "Sesiones" })).toBeNull();
    expect(within(sidebar).getByRole("link", { name: "Agenda" })).toBeTruthy();

    fireEvent.click(show);
    expect(within(sidebar).getByRole("link", { name: "Sesiones" })).toBeTruthy();
  });
});
