import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { StudentPortalSession } from "@/application/student-portal/ports/student-portal-port";
import { SessionEnrollmentForm } from "./session-enrollment-form";

afterEach(cleanup);

// Use a future date so the 1-hour cancellation deadline has not yet passed.
const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 h from now
const FUTURE_END = new Date(FUTURE.getTime() + 60 * 60 * 1000);

// Use a past date to test past-session behaviour (cancel deadline already passed).
const PAST = new Date("2026-10-08T18:00:00Z");
const PAST_END = new Date("2026-10-08T19:00:00Z");

const baseSession: StudentPortalSession = {
  id: "session-1",
  tenantId: "tenant-1",
  studentId: "student-1",
  className: "Entrenamiento",
  locationName: "Cancha Norte",
  startsAt: FUTURE,
  endsAt: FUTURE_END,
  timezone: "America/Santiago",
  capacity: 1,
  confirmedCount: 1,
  waitlistedCount: 0,
  enrollmentStatus: null,
  waitlistEnabled: false,
};

describe("SessionEnrollmentForm", () => {
  it("does not offer an enrollment for a full session without waitlist", () => {
    render(<SessionEnrollmentForm session={baseSession} />);
    expect(screen.getByText("Sesión completa")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reservar cupo" })).toBeNull();
  });

  it("lets a student join a waitlist when the session is full", () => {
    render(
      <SessionEnrollmentForm
        session={{ ...baseSession, waitlistEnabled: true }}
      />,
    );
    expect(screen.getByRole("button", { name: "Reservar cupo" })).toBeTruthy();
  });

  it("shows cancellation for a confirmed enrollment within the deadline", () => {
    render(
      <SessionEnrollmentForm
        session={{ ...baseSession, enrollmentStatus: "confirmed" }}
      />,
    );
    expect(screen.getByText("Reservada")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("hides the cancel button when the 1-hour deadline has passed", () => {
    render(
      <SessionEnrollmentForm
        session={{
          ...baseSession,
          startsAt: PAST,
          endsAt: PAST_END,
          enrollmentStatus: "confirmed",
        }}
      />,
    );
    expect(screen.getByText("Reservada")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    expect(screen.getByText("Plazo de cancelación vencido")).toBeTruthy();
  });
});
