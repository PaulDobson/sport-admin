import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell, ProductMark } from "./app-shell";
import { DesktopNavigation, MobileNavigation } from "./primary-navigation";

// Route is /dashboard/disciplines — Gym submenu should be open automatically
// and Disciplinas should be marked active.
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/disciplines",
}));

afterEach(cleanup);

function renderOperationalShell(role: "owner" | "assistant" = "owner") {
  return render(
    <AppShell
      sidebarHeader={<ProductMark context="Dueño" />}
      navigation={<DesktopNavigation role={role} />}
      mobileNavigation={
        <MobileNavigation role={role} quickAction={<button>Crear</button>} />
      }
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
    const sidebar = screen.getByRole("complementary", {
      name: "Navegación principal",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(sidebar.id);
    expect(toggle.className).toContain("hidden");
    expect(toggle.className).toContain("lg:flex");
    // Sidebar is expanded (not w-20)
    expect(sidebar.className).not.toContain("w-20");
  });

  it("collapses and expands without removing destinations or changing mobile navigation", () => {
    renderOperationalShell();
    const sidebar = screen.getByRole("complementary", {
      name: "Navegación principal",
    });
    const navigation = within(sidebar).getByRole("navigation", {
      name: "Secciones",
    });
    const mobile = screen.getByRole("navigation", { name: "Navegación móvil" });
    const mobileMarkup = mobile.innerHTML;

    fireEvent.click(
      screen.getByRole("button", { name: "Colapsar navegación" }),
    );

    const expand = screen.getByRole("button", { name: "Expandir navegación" });
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expect(sidebar.className).toContain("w-20");
    expect(screen.getByRole("main").parentElement?.className).toContain(
      "lg:pl-20",
    );
    // Disciplinas is active (route = /dashboard/disciplines)
    expect(
      within(navigation)
        .getByRole("link", { name: "Disciplinas" })
        .getAttribute("aria-current"),
    ).toBe("page");
    // Disciplinas is inside Gym submenu — verify it's visible and icon-only
    const disciplinasLink = within(navigation).getByRole("link", {
      name: "Disciplinas",
    });
    expect(disciplinasLink.querySelector("svg")).toBeTruthy();
    expect(within(disciplinasLink).getByText("Disciplinas").className).toBe(
      "sr-only",
    );
    // Mobile navigation is unchanged
    expect(mobile.innerHTML).toBe(mobileMarkup);
    expect(sidebar.className).toContain("motion-reduce:transition-none");

    fireEvent.click(expand);

    expect(sidebar.className).toContain("motion-reduce:transition-none");
    expect(within(navigation).getByText("Disciplinas").className).not.toBe(
      "sr-only",
    );
  });

  it("shows a compact link's label on keyboard focus", async () => {
    renderOperationalShell();
    fireEvent.click(
      screen.getByRole("button", { name: "Colapsar navegación" }),
    );
    const sidebar = screen.getByRole("complementary", {
      name: "Navegación principal",
    });
    const link = within(sidebar).getByRole("link", { name: "Disciplinas" });
    act(() => link.focus());
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Disciplinas",
    );
  });

  it("preserves role restrictions in compact mode — assistant cannot see Programación", () => {
    renderOperationalShell("assistant");
    fireEvent.click(
      screen.getByRole("button", { name: "Colapsar navegación" }),
    );
    const sidebar = screen.getByRole("complementary", {
      name: "Navegación principal",
    });
    // Assistant cannot access Programación
    expect(
      within(sidebar).queryByRole("link", { name: "Programación" }),
    ).toBeNull();
    // Assistant cannot access Mi gimnasio (gym is owner/admin only)
    expect(
      within(sidebar).queryByRole("link", { name: "Mi gimnasio" }),
    ).toBeNull();
    // But can see Sesiones and Alumnos
    expect(
      within(sidebar).getByRole("link", { name: "Sesiones" }),
    ).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "Alumnos" })).toBeTruthy();
  });

  it("toggles the Sesiones submenu while keeping the parent link", () => {
    renderOperationalShell();
    const sidebar = screen.getByRole("complementary", {
      name: "Navegación principal",
    });
    // Sesiones submenu is closed by default (route is /dashboard/disciplines, not a schedule route)
    const showBtn = within(sidebar).getByRole("button", {
      name: "Mostrar submenú de Sesiones",
    });
    expect(showBtn.getAttribute("aria-expanded")).toBe("false");
    // Parent "Sesiones" link is still accessible
    expect(
      within(sidebar).getByRole("link", { name: "Sesiones" }),
    ).toBeTruthy();

    // Open the submenu
    fireEvent.click(showBtn);

    const hideBtn = within(sidebar).getByRole("button", {
      name: "Ocultar submenú de Sesiones",
    });
    expect(hideBtn.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(sidebar).getByRole("link", { name: "Sesiones hoy" }),
    ).toBeTruthy();
    expect(
      within(sidebar).getByRole("link", { name: "Sesiones" }),
    ).toBeTruthy();

    // Close again
    fireEvent.click(hideBtn);
    expect(
      within(sidebar).queryByRole("link", { name: "Sesiones hoy" }),
    ).toBeNull();
    expect(
      within(sidebar).getByRole("link", { name: "Sesiones" }),
    ).toBeTruthy();
  });
});
