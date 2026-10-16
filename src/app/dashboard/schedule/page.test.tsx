import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SchedulePage from "./page";

const loadContext = vi.fn();
const getSessions = vi.fn();
const createDeps = vi.fn();
vi.mock("@/app/_lib/operational-context", () => ({
  loadOperationalContext: () => loadContext(),
}));
vi.mock("@/application/instructor-operations/use-cases/get-schedule-sessions", () => ({
  getScheduleSessions: (...args: unknown[]) => getSessions(...args),
}));
vi.mock("@/infrastructure/composition/instructor-operations-composition", () => ({
  createInstructorOperationsDeps: () => createDeps(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
}));

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T01:30:00Z"));
  loadContext.mockResolvedValue({ status: "ready", membership: { tenantId: "tenant-1", role: "instructor" } });
  createDeps.mockResolvedValue({ scheduleSessions: {} });
  getSessions.mockResolvedValue({
    locations: [{ id: "location-1", name: "Gimnasio Norte" }],
    disciplines: [{ id: "discipline-1", name: "TKD" }],
    sessions: [{
      id: "session-1", name: "TKD juvenil", locationId: "location-1", locationName: "Gimnasio Norte",
      startsAt: new Date("2026-10-07T01:00:00Z"), endsAt: new Date("2026-10-07T02:00:00Z"),
      confirmedCount: 3, capacity: 16, waitlistedCount: 2,
      status: "scheduled",
    }],
    total: 300,
    page: 1,
    pageSize: 25,
  });
});

describe("SchedulePage", () => {
  it("keeps tenant filtering and metrics scoped to the displayed sessions", async () => {
    render(await SchedulePage({ searchParams: Promise.resolve({ location: "location-1", discipline: "discipline-1", date: "2026-10-07", page: "1" }) }));
    expect(getSessions).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      locationId: "location-1",
      disciplineId: "discipline-1",
      status: "scheduled",
      from: "2026-10-01",
      through: "2026-10-31",
      page: "1",
    }, { scheduleSessions: {} });
    const summary = screen.getByRole("region", { name: "Resumen de las sesiones mostradas" });
    expect(within(summary).getByText("3")).toBeTruthy();
    expect(within(summary).getByText("2")).toBeTruthy();
    expect(summary.textContent).toContain("1 en curso");
    expect(screen.getByText(/Filtra por disciplina, ubicación o estado/i)).toBeTruthy();
    fireEvent.click(screen.getByText("Editar o cancelar sesión"));
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar sesión" })).toBeTruthy();
    const select = screen.getByRole("combobox", { name: "Ubicación" }) as HTMLSelectElement;
    expect(select.value).toBe("location-1");
    expect(select.closest("form")?.getAttribute("method")).toBe("get");
    expect(select.closest("form")?.getAttribute("action")).toBe("/dashboard/schedule");
    expect(screen.getByRole("link", { name: "Limpiar" }).getAttribute("href")).toBe("/dashboard/schedule?date=2026-10-07&period=month&view=grid");
    expect(screen.getByRole("navigation", { name: "Paginación de sesiones" }).textContent).toContain("Página 1 de 12");
    const nextLink = screen.getByRole("link", { name: /Siguiente/ });
    expect(nextLink.getAttribute("href")).toContain("location=location-1");
    expect(nextLink.getAttribute("href")).toContain("discipline=discipline-1");
    expect(nextLink.getAttribute("href")).toContain("date=2026-10-07");
    expect(screen.getByRole("spinbutton", { name: "Ir a página" }).getAttribute("max")).toBe("12");
    expect(screen.getByRole("navigation", { name: "Paginación de sesiones" }).querySelector('input[name="discipline"]')?.getAttribute("value")).toBe("discipline-1");
  });

  it.each(["instructor", "assistant"])("renders filtered empty state for %s", async (role) => {
    loadContext.mockResolvedValue({ status: "ready", membership: { tenantId: "tenant-1", role } });
    getSessions.mockResolvedValue({ locations: [{ id: "location-1", name: "Gimnasio Norte" }], disciplines: [], sessions: [], total: 0, page: 1, pageSize: 25 });
    render(await SchedulePage({ searchParams: Promise.resolve({ location: "location-1" }) }));
    expect(screen.getByRole("heading", { name: "No hay sesiones para estos filtros" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Programación" }) !== null).toBe(role === "instructor");
    expect(screen.queryAllByRole("link", { name: "Programar sesiones" }).length > 0).toBe(role === "instructor");
  });

  it("offers a useful unfiltered empty state without unauthorized actions", async () => {
    loadContext.mockResolvedValue({ status: "ready", membership: { tenantId: "tenant-1", role: "assistant" } });
    getSessions.mockResolvedValue({ locations: [], disciplines: [], sessions: [], total: 0, page: 1, pageSize: 25 });
    render(await SchedulePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "No hay sesiones para estos filtros" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Programar sesiones" })).toBeNull();
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toBeTruthy();
  });

  it("renders the table and preserves period and discipline when switching views", async () => {
    render(await SchedulePage({
      searchParams: Promise.resolve({
        view: "table",
        period: "week",
        date: "2026-10-07",
        discipline: "discipline-1",
      }),
    }));
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Cupos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Grid" }).getAttribute("href")).toContain("period=week");
    expect(screen.getByRole("link", { name: "Grid" }).getAttribute("href")).toContain("discipline=discipline-1");
    expect(getSessions).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-10-05", through: "2026-10-11" }),
      expect.anything(),
    );
  });

  it("uses the Santiago month by default and a full calendar month on request", async () => {
    await SchedulePage({ searchParams: Promise.resolve({}) });
    expect(getSessions).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: "2026-10-01", through: "2026-10-31" }),
      expect.anything(),
    );
    await SchedulePage({
      searchParams: Promise.resolve({ date: "2028-02-10", period: "month" }),
    });
    expect(getSessions).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: "2028-02-01", through: "2028-02-29" }),
      expect.anything(),
    );
  });

  it("separates period navigation from filters and preserves display settings", async () => {
    render(await SchedulePage({
      searchParams: Promise.resolve({
        date: "2026-12-31",
        period: "month",
        view: "table",
        discipline: "discipline-1",
        page: "8",
      }),
    }));
    const filterForm = screen.getByRole("button", { name: "Aplicar filtros" }).closest("form")!;
    expect(filterForm.querySelector('input[type="date"]')).toBeNull();
    expect(filterForm.querySelector('select[name="period"]')).toBeNull();
    expect(filterForm.querySelector('input[name="date"]')?.getAttribute("value")).toBe("2026-12-31");
    expect(filterForm.querySelector('input[name="period"]')?.getAttribute("value")).toBe("month");
    expect(filterForm.querySelector('input[name="page"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Período de visualización" });
    const dayLink = within(navigation).getByRole("link", { name: "Día" });
    expect(dayLink.getAttribute("href")).toContain("period=day");
    expect(dayLink.getAttribute("href")).toContain("discipline=discipline-1");
    expect(dayLink.getAttribute("href")).toContain("view=table");
    expect(dayLink.getAttribute("href")).not.toContain("page=");
    expect(screen.getByRole("link", { name: "Período anterior" }).getAttribute("href")).toContain("date=2026-11-30");
    expect(screen.getByRole("link", { name: "Período siguiente" }).getAttribute("href")).toContain("date=2027-01-01");
    const clearLink = screen.getByRole("link", { name: "Limpiar" });
    expect(clearLink.getAttribute("href")).toContain("period=month");
    expect(clearLink.getAttribute("href")).toContain("view=table");
    expect(clearLink.getAttribute("href")).not.toContain("discipline=");
  });

  it("queries one day when the day visualization is selected", async () => {
    await SchedulePage({
      searchParams: Promise.resolve({ date: "2026-10-13", period: "day" }),
    });
    expect(getSessions).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: "2026-10-13", through: "2026-10-13" }),
      expect.anything(),
    );
  });

  it("keeps cancelled table sessions read-only for assistants", async () => {
    loadContext.mockResolvedValue({
      status: "ready",
      membership: { tenantId: "tenant-1", role: "assistant" },
    });
    const result = await getSessions();
    getSessions.mockResolvedValue({
      ...result,
      sessions: result.sessions.map((session: { status: string }) => ({
        ...session,
        status: "cancelled",
      })),
    });
    render(await SchedulePage({
      searchParams: Promise.resolve({ view: "table", status: "cancelled" }),
    }));
    expect(screen.getByText("Cancelada")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Tomar asistencia/ })).toBeNull();
    expect(screen.queryByText("Editar o cancelar sesión")).toBeNull();
  });

  it.each([
    ["unauthenticated", "/log-in"], ["no-membership", "/onboarding"],
    ["selection-required", "/select-tenant"], ["no-operational-tenant", "/dashboard"],
  ])("redirects %s before querying data", async (status, path) => {
    loadContext.mockResolvedValue({ status });
    await expect(SchedulePage({ searchParams: Promise.resolve({}) })).rejects.toThrow(`redirect:${path}`);
    expect(getSessions).not.toHaveBeenCalled();
  });
});
