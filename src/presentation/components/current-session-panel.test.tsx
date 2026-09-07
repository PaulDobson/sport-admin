import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import { CurrentSessionPanel } from "./current-session-panel";

afterEach(cleanup);

const session: DaySession = {
  id: "session-1",
  name: "Morning class",
  locationId: "location-1",
  locationName: "Central Park",
  startsAt: new Date("2026-08-22T13:00:00Z"),
  endsAt: new Date("2026-08-22T14:00:00Z"),
  capacity: 10,
  confirmedCount: 7,
  waitlistedCount: 0,
};

describe("CurrentSessionPanel", () => {
  it("shows the active session and attendance action", () => {
    render(<CurrentSessionPanel currentSession={session} role="instructor" />);

    expect(screen.getByRole("region", { name: "Sesión actual" })).toBeTruthy();
    expect(screen.getByText("En curso")).toBeTruthy();
    expect(screen.getByText(/7\/10/)).toBeTruthy();
    expect(screen.getByText("Central Park")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir asistencia" })).toBeTruthy();
  });

  it("shows the next session when there is no active session", () => {
    render(
      <CurrentSessionPanel
        currentSession={null}
        nextSession={session}
        role="assistant"
      />,
    );

    expect(screen.getByRole("region", { name: "Próxima sesión" })).toBeTruthy();
    expect(screen.getByText("Programada")).toBeTruthy();
  });

  it("omits itself when no session is available", () => {
    render(<CurrentSessionPanel currentSession={null} role="owner" />);
    expect(screen.queryByRole("region")).toBeNull();
  });
});
