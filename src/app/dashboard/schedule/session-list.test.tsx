import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { SessionList } from "./session-list";
import { groupSessionsByDate, isSessionCurrent, sessionCapacity } from "./session-presentation";

afterEach(cleanup);
const now = new Date("2026-10-07T01:30:00Z");
const session: DaySession = {
  id: "session-1", name: "TKD juvenil", locationId: "location-1",
  locationName: "Gimnasio Norte", startsAt: new Date("2026-10-07T01:00:00Z"),
  endsAt: new Date("2026-10-07T02:00:00Z"), capacity: 16,
  confirmedCount: 4, waitlistedCount: 2,
};

describe("session presentation", () => {
  it("groups by Santiago dates and sorts a shuffled list", () => {
    const future = { ...session, id: "future", startsAt: new Date("2026-10-07T13:00:00Z") };
    const groups = groupSessionsByDate([future, session]);
    expect(groups.map((group) => group.date)).toEqual(["2026-10-06", "2026-10-07"]);
    expect(groups[0].sessions[0].id).toBe("session-1");
    render(<SessionList sessions={[future, session]} now={now} />);
    expect(screen.getByRole("heading", { name: /Hoy · martes, 6 de octubre de 2026/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /miércoles, 7 de octubre de 2026/ })).toBeTruthy();
    expect(screen.getAllByText("22:00")).toHaveLength(1);
  });

  it("marks each simultaneous session current and respects interval boundaries", () => {
    expect(isSessionCurrent(session, session.startsAt)).toBe(true);
    expect(isSessionCurrent(session, session.endsAt)).toBe(false);
    render(<SessionList sessions={[session, { ...session, id: "session-2", name: "Boxeo" }]} now={now} />);
    expect(screen.getAllByText("En curso")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Tomar asistencia de TKD juvenil" }).getAttribute("href")).toBe("/dashboard/sessions/session-1/attendance");
  });

  it("hides attendance for cancelled sessions and offers reactivation to managers", () => {
    render(
      <SessionList
        sessions={[{ ...session, status: "cancelled" }]}
        now={now}
        canManage
      />,
    );

    expect(screen.getByText("Cancelada")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Tomar asistencia de TKD juvenil" })).toBeNull();
    fireEvent.click(screen.getByText("Editar o cancelar sesión"));
    expect(screen.getByRole("button", { name: "Reactivar sesión" })).toBeTruthy();
  });

  it.each([
    [4, 16, 12, 25],
    [16, 16, 0, 100],
    [20, 16, 0, 100],
    [0, 16, 16, 0],
    [0, 0, 0, 0],
  ])("bounds occupancy for %i confirmed and capacity %i", (confirmedCount, capacity, available, percent) => {
    const item = { ...session, confirmedCount, capacity };
    expect(sessionCapacity(item)).toEqual({ available, percent });
    render(<SessionList sessions={[item]} now={now} />);
    const meter = screen.getByRole("meter", { name: "Ocupación de TKD juvenil" });
    expect(meter.getAttribute("aria-valuenow")).toBe(String(percent));
    expect((meter.firstElementChild as HTMLElement).style.width).toBe(`${percent}%`);
    expect(screen.getByText(`${available} cupos disponibles · 2 en espera`)).toBeTruthy();
    if (available === 0) expect(screen.getByText("Cupo completo")).toBeTruthy();
  });

  it("counts students who attended without reservation as participants", () => {
    const item = { ...session, confirmedCount: 0, waitlistedCount: 0, walkInCount: 2, attendedCount: 2 };
    expect(sessionCapacity(item)).toEqual({ available: 14, percent: 13 });
    render(<SessionList sessions={[item]} now={now} />);
    expect(screen.getByRole("meter", { name: "Ocupación de TKD juvenil" }).getAttribute("aria-valuetext")).toBe("2 participantes de 16 cupos");
    expect(screen.getByText("0 con reserva · 2 sin reserva")).toBeTruthy();
    expect(screen.getByText("14 cupos disponibles · 0 en espera")).toBeTruthy();
    expect(screen.getByText("2 presentes registrados")).toBeTruthy();
  });
});
