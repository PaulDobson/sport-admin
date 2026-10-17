import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DaySession, InstructorDay } from "@/domain/instructor-operations/instructor-day";
import { DashboardOverview } from "./dashboard-overview";

afterEach(cleanup);

const session = (overrides: Partial<DaySession>): DaySession => ({
  id: "s1",
  name: "Funcional",
  locationId: "l1",
  locationName: "Sede Norte",
  startsAt: new Date("2026-10-16T12:00:00Z"),
  endsAt: new Date("2026-10-16T13:00:00Z"),
  capacity: 10,
  confirmedCount: 4,
  waitlistedCount: 0,
  ...overrides,
});

const day: InstructorDay = {
  activeStudents: 42,
  pendingEnrollments: 3,
  locations: [
    { id: "l1", name: "Sede Norte" },
    { id: "l2", name: "Sede Sur" },
  ],
  currentSession: session({ id: "current", walkInCount: 1 }),
  upcomingSessions: [
    session({ id: "next", name: "Yoga", confirmedCount: 10, startsAt: new Date("2026-10-16T15:00:00Z") }),
  ],
};

describe("DashboardOverview", () => {
  it("summarises the day with KPIs, occupancy and locations", () => {
    render(<DashboardOverview day={day} now={new Date("2026-10-16T12:30:00Z")} />);

    const summary = screen.getByRole("region", { name: "Resumen de jornada" });
    expect(within(summary).getByText("42")).toBeTruthy();
    expect(within(summary).getByText("2")).toBeTruthy();
    expect(within(summary).getByText("75%")).toBeTruthy();
    expect(within(summary).getByText("15 de 20 cupos")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Ocupación del día" }).getAttribute("aria-valuenow")).toBe("75");

    const upcoming = screen.getByRole("region", { name: "Próximas sesiones" });
    expect(within(upcoming).getByRole("link", { name: /Asistencia de Yoga/ }).getAttribute("href")).toBe(
      "/dashboard/sessions/next/attendance",
    );
    expect(within(upcoming).getByText("10/10")).toBeTruthy();

    const locations = screen.getByRole("region", { name: "Estado de locaciones" });
    expect(within(locations).getByText("Alta demanda")).toBeTruthy();
    expect(within(locations).getByText("Sin sesiones")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Barras de ocupación" }).children).toHaveLength(2);
  });

  it("shows an empty state without sessions", () => {
    render(
      <DashboardOverview
        day={{ ...day, currentSession: null, upcomingSessions: [] }}
        now={new Date("2026-10-16T12:30:00Z")}
      />,
    );
    expect(screen.getByText("Sin próximas sesiones")).toBeTruthy();
    expect(screen.getByText("Sin sesiones para graficar en esta jornada.")).toBeTruthy();
  });

  it("shows the month finance block with collected, pending and a link to the summary", () => {
    render(
      <DashboardOverview
        day={day}
        now={new Date("2026-10-16T12:30:00Z")}
        finance={{
          currency: "CLP",
          collected: 320000,
          pending: 90000,
          overdueStudents: 2,
          collectionRate: 78,
        }}
      />,
    );

    const finance = screen.getByRole("region", { name: "Finanzas del mes" });
    expect(within(finance).getByText("Cobrado").nextElementSibling?.textContent).toBe("$320.000");
    expect(within(finance).getByText("Por cobrar").nextElementSibling?.textContent).toBe("$90.000");
    expect(within(finance).getByText("78 % cobrado")).toBeTruthy();
    expect(within(finance).getByRole("link", { name: "Ver finanzas" }).getAttribute("href")).toBe(
      "/dashboard/finance",
    );
    expect(
      within(finance).getByRole("link", { name: "2 alumnos en mora" }).getAttribute("href"),
    ).toBe("/dashboard/finance?section=collections&status=past_due");
  });

  it("omits the finance block when it is not provided, as for assistants", () => {
    render(<DashboardOverview day={day} now={new Date("2026-10-16T12:30:00Z")} />);

    expect(screen.queryByRole("region", { name: "Finanzas del mes" })).toBeNull();
  });
});
