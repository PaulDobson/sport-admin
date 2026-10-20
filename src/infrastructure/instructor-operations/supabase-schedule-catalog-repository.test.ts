import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseScheduleCatalogRepository } from "./supabase-schedule-catalog-repository";

const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock },
  auth: { persistSession: false, autoRefreshToken: false },
});
const repository = new SupabaseScheduleCatalogRepository(client);
const tenantId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
beforeEach(() => fetchMock.mockReset());
function response(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
}

describe("active discipline catalog", () => {
  it("includes addresses when selecting active places for programming", async () => {
    fetchMock.mockResolvedValue(response([{ id, name: "Sala Norte", address: "Calle Norte 123" }]));
    expect(await repository.listActiveLocations(tenantId)).toEqual([{ id, name: "Sala Norte", address: "Calle Norte 123" }]);
    const params = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(params.get("select")).toBe("id,name,address");
    expect(params.get("tenant_id")).toBe(`eq.${tenantId}`);
    expect(params.get("status")).toBe("eq.active");
  });
  it("loads name-ordered active disciplines for the trusted tenant", async () => {
    fetchMock.mockResolvedValue(response([{ id, name: "Yoga" }]));
    expect(await repository.listActiveDisciplines(tenantId)).toEqual([{ id, name: "Yoga" }]);
    const params = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(params.get("tenant_id")).toBe(`eq.${tenantId}`);
    expect(params.get("status")).toBe("eq.active");
    expect(params.get("select")).toBe("id,name");
    expect(params.get("order")).toBe("name.asc,id.asc");
  });
  it("validates the exact selected ID rather than matching a name", async () => {
    fetchMock.mockResolvedValue(response({ id }));
    expect(await repository.findActiveDiscipline(tenantId, id)).toEqual({ id });
    const params = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(params.get("tenant_id")).toBe(`eq.${tenantId}`);
    expect(params.get("status")).toBe("eq.active");
    expect(params.get("id")).toBe(`eq.${id}`);
    expect(params.has("name")).toBe(false);
  });
  it("returns null for an inaccessible discipline and handles an empty catalog", async () => {
    fetchMock.mockImplementation(async () => response([]));
    expect(await repository.findActiveDiscipline(tenantId, id)).toBeNull();
    expect(await repository.listActiveDisciplines(tenantId)).toEqual([]);
  });
  it("surfaces catalog errors", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: "42501", message: "permission denied" }), { status: 403, headers: { "content-type": "application/json" } }));
    await expect(repository.listActiveDisciplines(tenantId)).rejects.toMatchObject({ code: "42501" });
  });
});
