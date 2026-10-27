import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudentPortalSession } from "@/application/student-portal/ports/student-portal-port";
import StudentPortalPage from "./page";

const { getCurrentUserId, listMyStudents, listSessions, redirect } = vi.hoisted(
  () => ({
    getCurrentUserId: vi.fn(),
    listMyStudents: vi.fn(),
    listSessions: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw new Error(`redirect:${path}`);
    }),
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: () => ({ auth: { getCurrentUserId } }),
}));
vi.mock("@/infrastructure/composition/student-portal-composition", () => ({
  createStudentPortalDeps: () => ({
    portal: { listMyStudents, listSessions },
  }),
}));
vi.mock("@/application/student-portal/use-cases/student-portal", () => ({
  listMyStudentPortalStudents: ({
    portal,
  }: {
    portal: { listMyStudents: typeof listMyStudents };
  }) => portal.listMyStudents(),
  listStudentPortalSessions: (
    studentId: string,
    { portal }: { portal: { listSessions: typeof listSessions } },
  ) => portal.listSessions(studentId),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Use a date 2 days from now so it always falls within the current week.
const TWO_DAYS_FROM_NOW = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
TWO_DAYS_FROM_NOW.setHours(18, 0, 0, 0);
const TWO_DAYS_END = new Date(TWO_DAYS_FROM_NOW.getTime() + 60 * 60 * 1000);

const session: StudentPortalSession = {
  id: "session-1",
  tenantId: "tenant-1",
  studentId: "student-1",
  className: "Entrenamiento juvenil",
  locationName: "Cancha Norte",
  startsAt: TWO_DAYS_FROM_NOW,
  endsAt: TWO_DAYS_END,
  timezone: "America/Santiago",
  capacity: 12,
  confirmedCount: 4,
  waitlistedCount: 0,
  enrollmentStatus: null,
  waitlistEnabled: true,
};

describe("StudentPortalPage", () => {
  it("shows only linked student sessions and the reservation action", async () => {
    getCurrentUserId.mockResolvedValue("guardian-1");
    listMyStudents.mockResolvedValue([
      {
        id: "student-1",
        tenantId: "tenant-1",
        fullName: "Camila Soto",
        tenantName: "Academia Norte",
      },
    ]);
    listSessions.mockResolvedValue([session]);

    render(await StudentPortalPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /Hola, Camila/i })).toBeTruthy();
    // The session renders in both the mobile and desktop layout panels;
    // use getAllByText to tolerate duplicate DOM nodes.
    expect(screen.getAllByText("Entrenamiento juvenil").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Cancha Norte").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Reservar cupo" }).length,
    ).toBeGreaterThan(0);
    expect(listSessions).toHaveBeenCalledWith("student-1");
  });

  it("shows an empty state instead of querying sessions when no student is linked", async () => {
    getCurrentUserId.mockResolvedValue("guardian-2");
    listMyStudents.mockResolvedValue([]);

    render(await StudentPortalPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Tu acceso está casi listo")).toBeTruthy();
    expect(listSessions).not.toHaveBeenCalled();
  });
});
