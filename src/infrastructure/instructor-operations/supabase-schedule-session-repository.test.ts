import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseScheduleSessionRepository } from "./supabase-schedule-session-repository";

const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>(
  "https://test.supabase.co",
  "test-anon-key",
  {
    global: { fetch: fetchMock },
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const repository = new SupabaseScheduleSessionRepository(client);
const tenantId = "11111111-1111-4111-8111-111111111111";
const locationId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => fetchMock.mockReset());

function response(data: unknown, contentRange?: string) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
      ...(contentRange ? { "content-range": contentRange } : {}),
    },
  });
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return new URL(input);
  if (input instanceof URL) return new URL(input.href);
  if (input && typeof input === "object" && "url" in input) {
    return new URL(String(input.url));
  }
  throw new Error(`Unexpected fetch input: ${String(input)}`);
}

describe("schedule session repository", () => {
  it("loads the session identity scoped to its tenant", async () => {
    fetchMock.mockResolvedValue(response({
      id: "session-1",
      starts_at: "2026-10-08T13:00:00Z",
      ends_at: "2026-10-08T14:00:00Z",
      class_templates: { name: "Boxeo" },
      locations: { name: "Gimnasio Norte" },
    }));

    expect(await repository.findById(tenantId, "session-1")).toEqual({
      id: "session-1",
      name: "Boxeo",
      locationName: "Gimnasio Norte",
      startsAt: new Date("2026-10-08T13:00:00Z"),
      endsAt: new Date("2026-10-08T14:00:00Z"),
    });
    const params = requestUrl(fetchMock.mock.calls[0][0]).searchParams;
    expect(params.get("tenant_id")).toBe(`eq.${tenantId}`);
    expect(params.get("id")).toBe("eq.session-1");
  });

  it("returns null when the session is not visible", async () => {
    fetchMock.mockResolvedValue(response(null));
    expect(await repository.findById(tenantId, "missing")).toBeNull();
  });

  it("surfaces session lookup errors", async () => {
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ code: "42501", message: "permission denied" }),
      { status: 403, headers: { "content-type": "application/json" } },
    ));
    await expect(repository.findById(tenantId, "session-1")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("filters server-side and fetches only the requested page with a total count", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      if (!input) return new Response(null, { status: 204 });
      const url = requestUrl(input);
      if (url.pathname.endsWith("/locations")) {
        return response([{ id: locationId, name: "Gimnasio Norte" }]);
      }
      if (url.pathname.endsWith("/disciplines")) {
        return response([{ id: locationId, name: "Boxeo" }]);
      }
      return response(
        [
          {
            id: "session-1",
            location_id: locationId,
            starts_at: "2026-10-08T13:00:00.000Z",
            ends_at: "2026-10-08T14:00:00.000Z",
            capacity: 16,
            status: "scheduled",
            class_templates: { name: "Boxeo" },
            locations: { name: "Gimnasio Norte" },
            session_enrollments: [
              { status: "confirmed", student_id: "booked" },
              { status: "waitlisted", student_id: "waiting" },
            ],
            class_session_attendance: [
              { status: "present", student_id: "booked" },
              { status: "present", student_id: "walk-in" },
            ],
          },
        ],
        "25-49/300",
      );
    });

    const result = await repository.listPage({
      tenantId,
      locationId,
      disciplineId: locationId,
      query: "Boxeo",
      status: "scheduled",
      startsOnOrAfter: new Date("2026-10-08T03:00:00.000Z"),
      startsBefore: new Date("2026-10-31T03:00:00.000Z"),
      page: 2,
      pageSize: 25,
    });

    expect(result).toMatchObject({
      total: 300,
      locations: [{ id: locationId, name: "Gimnasio Norte" }],
      disciplines: [{ id: locationId, name: "Boxeo" }],
      sessions: [
        {
          id: "session-1",
          name: "Boxeo",
          confirmedCount: 1,
          waitlistedCount: 1,
          walkInCount: 1,
          attendedCount: 2,
          status: "scheduled",
        },
      ],
    });

    const sessionsRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/class_sessions?"),
    );
    expect(sessionsRequest).toBeDefined();
    const params = new URL(String(sessionsRequest?.[0])).searchParams;
    expect(params.get("tenant_id")).toBe(`eq.${tenantId}`);
    expect(params.get("status")).toBe("eq.scheduled");
    expect(params.get("location_id")).toBe(`eq.${locationId}`);
    expect(params.get("class_templates.name")).toBe("ilike.%Boxeo%");
    expect(params.get("class_templates.discipline_id")).toBe(`eq.${locationId}`);
    expect(params.getAll("starts_at")).toEqual([
      "gte.2026-10-08T03:00:00.000Z",
      "lt.2026-10-31T03:00:00.000Z",
    ]);
    expect(params.get("offset")).toBe("25");
    expect(params.get("limit")).toBe("25");
    expect(params.get("order")).toBe("starts_at.asc,id.asc");
    const headers = new Headers(sessionsRequest?.[1]?.headers);
    expect(headers.get("prefer")).toContain("count=exact");
  });

  it("surfaces database errors", async () => {
    fetchMock.mockImplementation(async (input) => {
      if (!input) return new Response(null, { status: 204 });
      if (requestUrl(input).pathname.endsWith("/locations")) return response([]);
      return new Response(
        JSON.stringify({ code: "42501", message: "permission denied" }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      );
    });

    await expect(
      repository.listPage({
        tenantId,
        status: "all",
        page: 1,
        pageSize: 25,
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
