import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseTenantBackoffice } from "./supabase-tenant-backoffice";

const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
});
const repository = new SupabaseTenantBackoffice(client);
const row = {
  id: "tenant-a", name: "Academia", status: "active", created_at: "2026-01-01T00:00:00Z",
  billing_contact_name: "Billing", billing_contact_email: "billing@example.cl",
  contact_name: "Ana", contact_email: "ana@example.cl", phone: "+56 9 1234 5678",
  address: "Central 123", city: "Santiago", region: "Metropolitana",
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
beforeEach(() => fetchMock.mockReset());

describe("SaaS tenant listing with gym details", () => {
  it("rejects the legacy RPC contract instead of disguising stored contacts as empty", async () => {
    const legacyRow = {
      id: row.id, name: row.name, status: row.status, created_at: row.created_at,
      billing_contact_name: row.billing_contact_name, billing_contact_email: row.billing_contact_email,
    };
    fetchMock.mockResolvedValueOnce(response([legacyRow]));
    await expect(repository.listTenants()).rejects.toThrow("0040_saas_tenant_details.sql");
  });
  it("does not disguise a null RPC response as an empty portfolio", async () => {
    fetchMock.mockResolvedValueOnce(response(null));
    await expect(repository.listTenants()).rejects.toThrow("formato incompatible");
  });
  it("maps all gym fields separately from billing in a single audited RPC", async () => {
    fetchMock.mockResolvedValueOnce(response([row]));
    expect(await repository.listTenants()).toEqual([{
      id: "tenant-a", name: "Academia", status: "active", createdAt: new Date(row.created_at),
      billingContactName: "Billing", billingContactEmail: "billing@example.cl",
      contactName: "Ana", contactEmail: "ana@example.cl", phone: "+56 9 1234 5678",
      address: "Central 123", city: "Santiago", region: "Metropolitana",
    }]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("/rpc/list_saas_tenants");
  });
  it("preserves null fields for academies without details", async () => {
    fetchMock.mockResolvedValueOnce(response([{ ...row, contact_name: null, contact_email: null, phone: null, address: null, city: null, region: null }]));
    expect((await repository.listTenants())[0]).toMatchObject({ contactName: null, contactEmail: null, address: null, city: null, region: null, phone: null, billingContactEmail: "billing@example.cl" });
  });
  it("propagates denied access instead of returning an empty portfolio", async () => {
    fetchMock.mockResolvedValueOnce(response({ message: "denied", code: "42501" }, 403));
    await expect(repository.listTenants()).rejects.toMatchObject({ code: "42501" });
  });
});
