import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabasePlanCatalog } from "./supabase-plan-catalog";

const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
});
const catalog = new SupabasePlanCatalog(client);
const id = "a1000000-0000-4000-8000-000000000001";
const versionId = "a1000000-0000-4000-8000-000000000002";
const row = {
  id, slug: "academia", status: "active",
  current_version: {
    id: versionId, version_number: 1, name: "Academia", description: null,
    price: 11900, currency: "CLP", duration_unit: "months", duration_count: 1,
    trial_days: 7, max_students: 100, max_users: 5, features: ["reports"],
    services: ["Capacitación"], legacy: false, created_at: "2026-01-01T00:00:00Z",
  },
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" },
});
beforeEach(() => fetchMock.mockReset());

describe("SupabasePlanCatalog runtime contracts", () => {
  it("maps versioned terms including immutable price and descriptive services", async () => {
    fetchMock.mockResolvedValueOnce(response({ plans: [row] }));
    expect(await catalog.list()).toEqual([{
      id, slug: "academia", status: "active", currentVersion: {
        id: versionId, versionNumber: 1, name: "Academia", description: null,
        price: 11900, currency: "CLP", durationUnit: "months", durationCount: 1,
        trialDays: 7, maxStudents: 100, maxUsers: 5, features: ["reports"],
        services: ["Capacitación"], legacy: false, createdAt: "2026-01-01T00:00:00Z",
      },
    }]);
  });
  it.each([null, [], {}, { plans: [{ ...row, current_version: null }] },
    { plans: [{ ...row, current_version: { ...row.current_version, features: ["unsupported"] } }] },
    { plans: [{ ...row, current_version: { ...row.current_version, price: 11900.5 } }] },
  ])("rejects incomplete or incompatible contracts %j", async (body) => {
    fetchMock.mockResolvedValueOnce(response(body));
    await expect(catalog.list()).rejects.toThrow("formato incompatible");
  });
  it("preserves historical foreign currencies and fractional legacy prices", async () => {
    fetchMock.mockResolvedValueOnce(response({ plans: [{ ...row, current_version: {
      ...row.current_version, currency: "USD", price: 19.99, legacy: true,
    } }] }));
    expect((await catalog.list())[0].currentVersion).toMatchObject({ currency: "USD", price: 19.99, legacy: true });
  });
  it("reports a missing migration explicitly, never as an empty catalog", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "PGRST202", message: "missing function" }, 404));
    await expect(catalog.list()).rejects.toThrow("migraciones SaaS 0041 a 0043");
  });
  it("sends the exact payload and validates publication confirmation", async () => {
    fetchMock.mockResolvedValueOnce(response({ plan_id: id, version_id: versionId, version_number: 2 }));
    const terms = {
      name: "Academia", description: null, price: 11900, durationUnit: "months" as const,
      durationCount: 1, trialDays: 7, maxStudents: 100, maxUsers: 5,
      features: ["reports" as const], services: ["Capacitación"],
    };
    expect(await catalog.publish({ planId: id, expectedVersionId: versionId, operationId: id, reason: "Ajustar oferta", terms }))
      .toEqual({ planId: id, versionId, versionNumber: 2 });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      operation_id: id, target_plan: id, expected_version: versionId,
      terms: { duration_unit: "months", price: 11900, services: ["Capacitación"] },
    });
  });
  it("rejects stale version conflicts with an actionable error", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "40001", message: "stale" }, 409));
    await expect(catalog.archive({ planId: id, expectedVersionId: versionId, operationId: id, reason: "Archivar" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("does not treat a response for another plan as a successful archive", async () => {
    fetchMock.mockResolvedValueOnce(response({ plan_id: versionId, status: "archived" }));
    await expect(catalog.archive({ planId: id, expectedVersionId: versionId, operationId: id, reason: "Archivar" }))
      .rejects.toThrow("otro plan");
  });
});
