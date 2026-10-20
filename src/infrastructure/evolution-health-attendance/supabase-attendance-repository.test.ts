import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseAttendanceRepository } from "./supabase-attendance-repository";
import { SupabaseHealthRepository } from "./supabase-health-repository";

function fixture(failAttendance = false) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    let data: unknown = [];
    if (url.pathname.endsWith("/session_enrollments")) {
      data = [{ student_id: "reserved", students: { full_name: "Ana" } }];
    } else if (url.pathname.endsWith("/class_session_attendance")) {
      if (failAttendance) return new Response(JSON.stringify({ message: "Attendance unavailable" }), { status: 500 });
      data = [
        { student_id: "reserved", students: { full_name: "Ana" }, status: "late", note: "Tráfico" },
        { student_id: "walk-in", students: { full_name: "Luis" }, status: "present", note: null },
      ];
    }
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  });
  const client = createClient<Database>("http://localhost:54321", "test-anon-key", { global: { fetch } });
  return { client, fetch };
}

describe("attendance roster persistence", () => {
  it("uses the bounded search RPC without fetching student contact or health data", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify([
      { student_id: "student-1", student_name: "José Soto", total_count: 230 },
    ]), { headers: { "Content-Type": "application/json" } }));
    const client = createClient<Database>("http://localhost:54321", "test-anon-key", { global: { fetch } });
    expect(await new SupabaseAttendanceRepository(client).searchStudents("tenant-1", "jose soto", 2)).toEqual({
      students: [{ studentId: "student-1", studentName: "José Soto" }], total: 230,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("writes walk-in attendance directly without creating or updating reservations", async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const rows = JSON.parse(String(init?.body)).map((row: Record<string, unknown>) => ({
        ...row, id: "record-1", recorded_at: "2026-10-14T23:00:00Z", updated_at: "2026-10-14T23:00:00Z",
      }));
      return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json" } });
    });
    const client = createClient<Database>("http://localhost:54321", "test-anon-key", { global: { fetch } });
    const records = await new SupabaseAttendanceRepository(client).saveBatch({
      tenantId: "tenant-1", sessionId: "session-1", recordedByMembershipId: "member-1",
      items: [{ studentId: "walk-in", status: "present", operationId: "operation-1" }],
    });
    expect(records[0]).toMatchObject({ studentId: "walk-in", sessionId: "session-1", status: "present" });
    expect(fetch).toHaveBeenCalledOnce();
    const [input, init] = fetch.mock.calls[0];
    const url = new URL(String(input));
    expect(url.pathname).toBe("/rest/v1/class_session_attendance");
    expect(url.searchParams.get("on_conflict")).toBe("tenant_id,session_id,student_id");
    expect(JSON.parse(String(init?.body))).toEqual([{
      tenant_id: "tenant-1", session_id: "session-1", student_id: "walk-in",
      recorded_by_membership_id: "member-1", status: "present", operation_id: "operation-1",
    }]);
  });

  it("unions confirmed reservations and recorded walk-ins without duplicate students", async () => {
    const { client, fetch } = fixture();
    const roster = await new SupabaseAttendanceRepository(client).listExpectedParticipants("tenant-1", "session-1");
    expect(roster).toEqual([
      { studentId: "reserved", studentName: "Ana", currentStatus: "late", note: "Tráfico", withoutReservation: false },
      { studentId: "walk-in", studentName: "Luis", currentStatus: "present", note: undefined, withoutReservation: true },
    ]);
    for (const [input] of fetch.mock.calls) {
      const url = new URL(String(input));
      expect(url.searchParams.get("tenant_id")).toBe("eq.tenant-1");
      expect(url.searchParams.get("session_id")).toBe("eq.session-1");
    }
    const enrollmentUrl = new URL(String(fetch.mock.calls.find(([input]) => String(input).includes("session_enrollments"))![0]));
    expect(enrollmentUrl.searchParams.get("status")).toBe("eq.confirmed");
  });

  it("includes recorded walk-ins in session health checks without changing reservations", async () => {
    const { client, fetch } = fixture();
    const health = await new SupabaseHealthRepository(client).listSessionParticipantHealth("tenant-1", "session-1", "2026-10-14");
    expect(health.map((participant) => participant.studentId)).toEqual(["reserved", "walk-in"]);
    const restrictionUrl = new URL(String(fetch.mock.calls.find(([input]) => String(input).includes("health_restrictions"))![0]));
    expect(restrictionUrl.searchParams.get("student_id")).toBe("in.(reserved,walk-in)");
    expect(restrictionUrl.searchParams.get("tenant_id")).toBe("eq.tenant-1");
  });

  it("surfaces attendance read failures instead of hiding recorded walk-ins", async () => {
    const { client } = fixture(true);
    await expect(new SupabaseAttendanceRepository(client).listExpectedParticipants("tenant-1", "session-1")).rejects.toMatchObject({ message: "Attendance unavailable" });
  });
});
