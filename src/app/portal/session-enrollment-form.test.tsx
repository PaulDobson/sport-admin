import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { StudentPortalSession } from "@/application/student-portal/ports/student-portal-port";
import { SessionEnrollmentForm } from "./session-enrollment-form";

afterEach(cleanup);

const baseSession: StudentPortalSession = {
  id: "session-1",
  tenantId: "tenant-1",
  studentId: "student-1",
  className: "Entrenamiento",
  locationName: "Cancha Norte",
  startsAt: new Date("2026-10-08T18:00:00Z"),
  endsAt: new Date("2026-10-08T19:00:00Z"),
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

  it("shows cancellation for a confirmed enrollment", () => {
    render(
      <SessionEnrollmentForm
        session={{ ...baseSession, enrollmentStatus: "confirmed" }}
      />,
    );
    expect(screen.getByText("Reservada")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });
});
