import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AttendancePage from "./page";

const { findById } = vi.hoisted(() => ({ findById: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));
vi.mock("@/infrastructure/composition/instructor-operations-composition", () => ({
  createInstructorOperationsDeps: async () => ({ scheduleSessions: { findById } }),
}));
vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: async () => ({ id: "membership-1", tenantId: "tenant-1", role: "instructor" }),
}));
vi.mock("@/infrastructure/composition/evolution-health-attendance-composition", () => ({
  createEvolutionHealthAttendanceDeps: async () => ({}),
}));
vi.mock("@/application/evolution-health-attendance/use-cases/get-attendance-roster", () => ({
  getAttendanceRoster: async () => [],
}));
vi.mock("@/app/dashboard/offline-synchronization", () => ({ OfflineSynchronization: () => null }));
vi.mock("./session-realtime-refresh", () => ({ SessionRealtimeRefresh: () => null }));
vi.mock("./attendance-form", () => ({ AttendanceForm: () => <h2>Añadir alumno sin reserva</h2> }));
afterEach(cleanup);
beforeEach(() => {
  findById.mockReset();
  findById.mockResolvedValue({
    id: "session-1",
    name: "Boxeo",
    locationName: "Gimnasio Norte",
    startsAt: new Date("2026-10-09T01:00:00Z"),
    endsAt: new Date("2026-10-09T02:00:00Z"),
  });
});

describe("AttendancePage navigation", () => {
  it("renders attendance without the pre-session alerts section", async () => {
    render(await AttendancePage({ params: Promise.resolve({ sessionId: "session-1" }) }));

    expect(screen.queryByRole("heading", { name: "Alertas antes de iniciar" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Añadir alumno sin reserva" })).toBeTruthy();
  });

  it("identifies the session with its name, local date, time range and location", async () => {
    render(await AttendancePage({ params: Promise.resolve({ sessionId: "session-1" }) }));

    expect(findById).toHaveBeenCalledWith("tenant-1", "session-1");
    expect(screen.getByRole("heading", { level: 1, name: "Boxeo" })).toBeTruthy();
    expect(screen.getByText("jueves, 8 de octubre de 2026")).toBeTruthy();
    expect(screen.getByText("22:00").getAttribute("datetime")).toBe("2026-10-09T01:00:00.000Z");
    expect(screen.getByText("23:00").getAttribute("datetime")).toBe("2026-10-09T02:00:00.000Z");
    expect(screen.getByText("Gimnasio Norte")).toBeTruthy();
  });

  it("does not show an attendance form for a missing or inaccessible session", async () => {
    findById.mockResolvedValue(null);
    await expect(
      AttendancePage({ params: Promise.resolve({ sessionId: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("surfaces session lookup errors", async () => {
    findById.mockRejectedValue(new Error("Database unavailable"));
    await expect(
      AttendancePage({ params: Promise.resolve({ sessionId: "session-1" }) }),
    ).rejects.toThrow("Database unavailable");
  });

  it("offers an unconditional return to Agenda inside the main content", async () => {
    render(await AttendancePage({ params: Promise.resolve({ sessionId: "session-1" }) }));
    const link = screen.getByRole("link", { name: "Volver a sesiones" });
    expect(link.getAttribute("href")).toBe("/dashboard/schedule");
    expect(link.className).not.toMatch(/\bhidden\b/);
    expect(link.className).toContain("min-h-11");
    expect(screen.getByRole("heading", { name: "Añadir alumno sin reserva" })).toBeTruthy();
  });
});
