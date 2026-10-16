import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { SessionTable } from "./session-table";

afterEach(cleanup);

const session: DaySession = {
  id: "session-1",
  name: "Amateur",
  locationId: "location-1",
  locationName: "Naeki",
  startsAt: new Date("2026-10-20T23:00:00Z"),
  endsAt: new Date("2026-10-21T00:00:00Z"),
  capacity: 15,
  confirmedCount: 5,
  waitlistedCount: 2,
  status: "scheduled",
};
const now = new Date("2026-10-14T23:00:00Z");

describe("desktop session table", () => {
  it("uses compact labeled icons and opens maintenance outside the table", () => {
    render(<SessionTable sessions={[session]} now={now} canManage />);
    const attendance = screen.getByRole("link", { name: "Tomar asistencia de Amateur" });
    expect(attendance.getAttribute("href")).toBe("/dashboard/sessions/session-1/attendance");
    expect(attendance.textContent).toBe("");
    expect(screen.queryByText("Editar o cancelar sesión")).toBeNull();
    const edit = screen.getByRole("button", { name: "Editar o cancelar sesión de Amateur" });
    fireEvent.click(edit);
    const dialog = screen.getByRole("dialog", { name: "Gestionar Amateur" });
    expect(screen.getByRole("table").contains(dialog)).toBe(false);
    expect(within(dialog).getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Cancelar sesión" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(document.activeElement).toBe(edit);
  });

  it("keeps same-day dates concise and exposes bounded occupancy", () => {
    render(<SessionTable sessions={[session]} now={now} canManage={false} />);
    expect(screen.getAllByText("martes, 20 de octubre de 2026")).toHaveLength(1);
    expect(screen.getByText("20:00")).toBeTruthy();
    expect(screen.getByText("21:00")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("33");
    expect(screen.queryByRole("button", { name: /Editar o cancelar/ })).toBeNull();
  });

  it("shows the ending date for sessions crossing midnight", () => {
    render(<SessionTable sessions={[{ ...session, endsAt: new Date("2026-10-21T04:00:00Z") }]} now={now} canManage={false} />);
    expect(screen.getByText(/miércoles, 21 de octubre de 2026 · 01:00/)).toBeTruthy();
  });

  it("preserves reactivation for cancelled sessions and hides edits for completed sessions", () => {
    render(<SessionTable sessions={[{ ...session, status: "cancelled" }, { ...session, id: "done", name: "Final", status: "completed" }]} now={now} canManage />);
    expect(screen.queryByRole("link", { name: "Tomar asistencia de Amateur" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar o cancelar sesión de Final" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Editar o cancelar sesión de Amateur" }));
    expect(screen.getByRole("button", { name: "Reactivar sesión" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancelar sesión" })).toBeNull();
  });
});
