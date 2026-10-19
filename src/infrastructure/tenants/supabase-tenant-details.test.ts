import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseTenantDetails } from "./supabase-tenant-details";

const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
});
const repository = new SupabaseTenantDetails(client);
const row = { tenant_id: "tenant-a", name: "Academia", address: null, contact_name: "Ana", contact_email: "ana@example.cl", phone: null, city: "Santiago", region: null };
function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
beforeEach(() => fetchMock.mockReset());

describe("SupabaseTenantDetails", () => {
  it("loads only through the permission-checked RPC and maps all seven fields", async () => {
    fetchMock.mockResolvedValueOnce(respond([row]));
    expect(await repository.findByTenantId("tenant-a")).toEqual({ tenantId: "tenant-a", name: "Academia", address: null, contactName: "Ana", contactEmail: "ana@example.cl", phone: null, city: "Santiago", region: null });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/rpc/get_tenant_details");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ target_tenant: "tenant-a" });
  });
  it("returns null when no academy is found", async () => {
    fetchMock.mockResolvedValueOnce(respond([]));
    expect(await repository.findByTenantId("missing")).toBeNull();
  });
  it("updates atomically without billing, account or membership fields", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await repository.update({ tenantId: "tenant-a", name: "New academy", address: null, contactName: "Ana", contactEmail: null, phone: "+56 9 1234 5678", city: null, region: null });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/rpc/update_tenant_details");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      target_tenant: "tenant-a", target_name: "New academy", target_address: "",
      target_contact_name: "Ana", target_contact_email: "", target_phone: "+56 9 1234 5678", target_city: "", target_region: "",
    });
  });
  it("propagates read and write authorization failures", async () => {
    fetchMock.mockResolvedValueOnce(respond({ message: "denied", code: "42501" }, 403))
      .mockResolvedValueOnce(respond({ message: "denied", code: "42501" }, 403));
    await expect(repository.findByTenantId("tenant-a")).rejects.toMatchObject({ code: "42501" });
    await expect(repository.update({ tenantId: "tenant-a", name: "New academy", address: null, contactName: null, contactEmail: null, phone: null, city: null, region: null })).rejects.toMatchObject({ code: "42501" });
  });
});
