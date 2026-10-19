import { describe, expect, it, vi } from "vitest";
import type { ScheduleSessionRepositoryPort } from "../ports/schedule-session-repository-port";
import { getScheduleSessions } from "./get-schedule-sessions";

const tenantId = "10000000-0000-4000-8000-000000000001";
const locationId = "10000000-0000-4000-8000-000000000002";

describe("getScheduleSessions", () => {
  it("returns a paginated session search with the requested filters", async () => {
    const futureSession = {
      id: "future",
      name: "Evening class",
      locationId,
      locationName: "Central Park",
      startsAt: new Date("2026-10-08T17:00:00Z"),
      endsAt: new Date("2026-10-08T18:00:00Z"),
      capacity: 8,
      confirmedCount: 3,
      waitlistedCount: 0,
      status: "scheduled" as const,
    };
    const listPage = vi.fn(async () => ({
      locations: [{ id: locationId, name: "Central Park" }],
      disciplines: [],
      sessions: [futureSession],
      total: 51,
    }));
    const scheduleSessions = { listPage, findById: vi.fn() } satisfies ScheduleSessionRepositoryPort;

    const result = await getScheduleSessions(
      {
        tenantId,
        locationId,
        disciplineId: locationId,
        query: "Evening",
        status: "scheduled",
        from: "2026-10-08",
        through: "2026-10-30",
        page: "2",
      },
      { scheduleSessions },
    );

    expect(result).toMatchObject({
      sessions: [futureSession],
      total: 51,
      page: 2,
      pageSize: 25,
    });
    expect(listPage).toHaveBeenCalledWith({
      tenantId,
      locationId,
      disciplineId: locationId,
      query: "Evening",
      status: "scheduled",
      startsOnOrAfter: new Date("2026-10-08T03:00:00.000Z"),
      startsBefore: new Date("2026-10-31T03:00:00.000Z"),
      page: 2,
      pageSize: 25,
    });
  });

  it("rejects inverted date ranges before querying the repository", async () => {
    const listPage = vi.fn();

    await expect(
      getScheduleSessions(
        { tenantId, from: "2026-10-31", through: "2026-10-08" },
        { scheduleSessions: { listPage, findById: vi.fn() } },
      ),
    ).rejects.toThrow("La fecha final no puede ser anterior");
    expect(listPage).not.toHaveBeenCalled();
  });

  it("moves stale page requests to the last available page", async () => {
    const listPage = vi
      .fn()
      .mockResolvedValueOnce({
        locations: [],
        sessions: [],
        total: 26,
      })
      .mockResolvedValueOnce({
        locations: [],
        sessions: [{ id: "last-session" }],
        total: 26,
      });

    const result = await getScheduleSessions(
      { tenantId, page: 8 },
      { scheduleSessions: { listPage, findById: vi.fn() } },
    );

    expect(listPage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, pageSize: 25 }),
    );
    expect(result).toMatchObject({ page: 2, total: 26 });
  });

  it("loads a whole period in one page for calendar views and caps the page size", async () => {
    const listPage = vi.fn(async () => ({ locations: [], disciplines: [], sessions: [], total: 0 }));
    const deps = { scheduleSessions: { listPage, findById: vi.fn() } };

    const result = await getScheduleSessions({ tenantId, pageSize: 500 }, deps);

    expect(listPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 500 }));
    expect(result).toMatchObject({ pageSize: 500 });
    await expect(getScheduleSessions({ tenantId, pageSize: 501 }, deps)).rejects.toThrow();
  });
});
