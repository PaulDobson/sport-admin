import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseCollections } from "./supabase-collections";
import { SupabaseBillingIssuer } from "./supabase-billing-issuer";
import { parseCollectionFilters } from "@/application/saas-administration/use-cases/list-collections";

const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
});
const collections = new SupabaseCollections(client);
const issuerPort = new SupabaseBillingIssuer(client);
const id = "ad480000-0000-4000-8000-000000000001";
const otherId = "ad480000-0000-4000-8000-000000000002";
const row = {
  id, tenant_id: id, tenant_name: "Academia", subscription_id: id, invoice_number: "INV-001",
  stored_status: "open", status: "past_due", invoice_kind: "legacy", amount: 100,
  currency: "USD", confirmed_amount: 30.25, balance: 69.75, in_flight_count: 1,
  imported_settlement: false, period_starts_on: "2026-01-01", period_end_exclusive: "2026-02-01",
  due_on: "2026-01-01", issued_at: "2026-01-01T00:00:00Z", paid_at: null, plan_name: null,
};
const page = { business_date: "2026-10-18", total: 1, page: 1, page_size: 20, items: [row] };
const issuer = { id, version_number: 1, legal_name: "Plataforma", tax_id: "12345678-5",
  address: "Calle 1", email: "emisor@example.invalid", created_at: "2026-01-01T00:00:00Z" };
const saveInput = { operationId: otherId, expectedVersionId: null, legalName: issuer.legal_name,
  taxId: issuer.tax_id, address: issuer.address, email: issuer.email, reason: "Configurar emisor" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" },
});
beforeEach(() => fetchMock.mockReset());

describe("collections runtime contract", () => {
  it("preserves legacy cents/currency and reports partial balance without recomputing in JavaScript", async () => {
    fetchMock.mockResolvedValueOnce(response(page));
    expect((await collections.list(parseCollectionFilters({}))).items[0])
      .toMatchObject({ amount: 100, currency: "USD", balance: 69.75, confirmedAmount: 30.25, inFlightCount: 1 });
  });
  it("sends all filters and pagination to the database", async () => {
    fetchMock.mockResolvedValueOnce(response({ ...page, page: 2, items: [] }));
    await collections.list(parseCollectionFilters({ page: 2, tenantId: id, query: "Academia", status: "past_due",
      currency: "USD", dueFrom: "2026-01-01", dueUntil: "2026-10-18" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      target_tenant: id, tenant_query: "Academia", target_status: "past_due", target_currency: "USD",
      due_from: "2026-01-01", due_until: "2026-10-18", page_number: 2, page_size: 20,
    });
  });
  it.each([null, {}, { ...page, total: undefined }, { ...page, items: [{ ...row, balance: undefined }] },
    { ...page, items: [{ ...row, status: "paid", balance: 10 }] }, { ...page, items: [{ ...row, period_end_exclusive: "2025-01-01" }] },
  ])("rejects missing or contradictory amounts %j", async (body) => {
    fetchMock.mockResolvedValueOnce(response(body));
    await expect(collections.list(parseCollectionFilters({}))).rejects.toThrow("incompatible");
  });
  it.each([{ page: 2 }, { items: [row, row] }, { page_size: 10 }])("rejects page identity and duplicate mismatches %j", async (patch) => {
    fetchMock.mockResolvedValueOnce(response({ ...page, ...patch }));
    await expect(collections.list(parseCollectionFilters({}))).rejects.toThrow("filtros");
  });
  it.each([{ tenantId: otherId }, { status: "paid" }, { currency: "CLP" }, { dueFrom: "2026-02-01" }, { dueUntil: "2025-12-31" }])(
    "rejects rows outside requested filters %j", async (filters) => {
      fetchMock.mockResolvedValueOnce(response(page));
      await expect(collections.list(parseCollectionFilters(filters))).rejects.toThrow("filtros");
    },
  );
  it("maps detail events and explicit truncated counts", async () => {
    fetchMock.mockResolvedValueOnce(response({ business_date: "2026-10-18", invoice: row,
      charges: [{ id, amount: 30.25, currency: "USD", status: "succeeded", occurred_at: "2026-01-01T00:00:00Z",
        provider: "legacy", manual_method: null, manual_reference: null }],
      refunds: [{ id: otherId, charge_id: id, amount: 10, currency: "USD", status: "succeeded",
        requested_at: "2026-01-02T00:00:00Z", processed_at: "2026-01-02T00:00:00Z", reason: "Legacy refund" }],
      charge_count: 101, refund_count: 1 }));
    expect(await collections.get(id)).toMatchObject({ chargeCount: 101, refundCount: 1,
      invoice: { id }, charges: [{ occurredAt: "2026-01-01T00:00:00Z" }], refunds: [{ chargeId: id }] });
  });
  it("rejects a detail for another invoice", async () => {
    fetchMock.mockResolvedValueOnce(response({ business_date: "2026-10-18", invoice: { ...row, id: otherId },
      charges: [], refunds: [], charge_count: 0, refund_count: 0 }));
    await expect(collections.get(id)).rejects.toThrow("no corresponde");
  });
  it("reports missing invoices", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "P0002", message: "missing" }, 400));
    await expect(collections.get(id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("issuer runtime contract", () => {
  it("distinguishes an explicitly absent issuer from malformed data", async () => {
    fetchMock.mockResolvedValueOnce(response({ issuer: null }));
    expect(await issuerPort.get()).toBeNull();
    fetchMock.mockResolvedValueOnce(response({}));
    await expect(issuerPort.get()).rejects.toThrow("incompatible");
  });
  it("maps the immutable issuer version and checks submitted values on save", async () => {
    fetchMock.mockResolvedValueOnce(response({ issuer }));
    expect(await issuerPort.save(saveInput)).toMatchObject({ id, versionNumber: 1, taxId: "12345678-5" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      operation_id: otherId, expected_version: null, legal_name: "Plataforma", tax_id: "12345678-5",
    });
  });
  it.each([{ tax_id: "12345678-0" }, { version_number: 0 }, { address: "" }])("rejects incomplete issuer %j", async (patch) => {
    fetchMock.mockResolvedValueOnce(response({ issuer: { ...issuer, ...patch } }));
    await expect(issuerPort.get()).rejects.toThrow("incompatible");
  });
  it("does not accept a different saved identity as success", async () => {
    fetchMock.mockResolvedValueOnce(response({ issuer: { ...issuer, legal_name: "Otra empresa" } }));
    await expect(issuerPort.save(saveInput)).rejects.toThrow("no coincide");
  });
  it.each(["40001", "23505"])("reports stale/idempotency conflict %s", async (code) => {
    fetchMock.mockResolvedValueOnce(response({ code, message: "conflict" }, 409));
    await expect(issuerPort.save(saveInput)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
describe("billing RPC errors", () => {
  it.each(["PGRST202", "42883"])("makes missing migration %s actionable", async (code) => {
    fetchMock.mockResolvedValueOnce(response({ code, message: "missing" }, 404));
    await expect(collections.list(parseCollectionFilters({}))).rejects.toThrow("0048");
  });
  it("does not hide unexpected database failures", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "XX000", message: "database error" }, 500));
    await expect(issuerPort.get()).rejects.toMatchObject({ code: "XX000" });
  });
});
