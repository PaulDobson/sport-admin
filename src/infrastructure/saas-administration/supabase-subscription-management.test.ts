import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseSubscriptionManagement } from "./supabase-subscription-management";

const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
});
const repository = new SupabaseSubscriptionManagement(client);
const tenantId = "ad440000-0000-4000-8000-000000000001";
const versionId = "ad440000-0000-4000-8000-000000000002";
const planId = "ad440000-0000-4000-8000-000000000003";
const invoiceId = "ad440000-0000-4000-8000-000000000004";
const request = { tenantId, planVersionId: versionId, startsOn: "2028-01-31", useTrial: false, dueOn: null };
const preview = {
  tenant_id: tenantId, tenant_name: "Academia", tenant_status: "active", plan_id: planId,
  plan_version_id: versionId, plan_name: "Pro", version_number: 1, fingerprint: "a".repeat(32),
  business_date: "2028-01-31", starts_on: "2028-01-31", use_trial: false, trial_end_exclusive: null,
  first_paid_period: { starts_on: "2028-01-31", end_exclusive: "2028-02-29" },
  due_on: "2028-01-31", price: 11900, currency: "CLP", initial_amount: 11900, initial_invoice: true,
  net: 10000, vat: 1900, duration_unit: "months", duration_count: 1,
  active_students: 10, active_users: 2, max_students: 100, max_users: 5,
  features: ["reports"], services: ["Capacitación"],
  contract_snapshot: { id: versionId, name: "Pro", price: 11900, currency: "CLP" },
};
const result = {
  tenant_id: tenantId, subscription_id: planId, plan_version_id: versionId,
  invoice_id: invoiceId, status: "active", initial_amount: 11900, period_end_exclusive: "2028-02-29",
};
const confirmation = { ...request, fingerprint: "a".repeat(32), operationId: tenantId, reason: "Nueva contratación" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
beforeEach(() => fetchMock.mockReset());

describe("subscription RPC runtime contracts", () => {
  it("maps an authoritative server preview and retains null as the requested default deadline", async () => {
    fetchMock.mockResolvedValueOnce(response(preview));
    expect(await repository.previewAssignment(request)).toMatchObject({
      ...request, fingerprint: preview.fingerprint, resolvedDueOn: "2028-01-31",
      firstPaidPeriod: { startsOn: "2028-01-31", endsBefore: "2028-02-29" },
      initialAmount: 11900, createsInvoice: true, net: 10000, vat: 1900,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      target_tenant: tenantId, target_version: versionId, starts_on: "2028-01-31", use_trial: false, due_on: null,
    });
  });
  it.each([
    null, {}, { ...preview, vat: 1901 }, { ...preview, net: 9999 }, { ...preview, initial_amount: 1 },
    { ...preview, initial_invoice: false }, { ...preview, currency: "USD" },
    { ...preview, first_paid_period: { starts_on: "2028-01-31", end_exclusive: "2028-01-31" } },
    { ...preview, use_trial: true }, { ...preview, active_users: 6 },
    { ...preview, contract_snapshot: { ...preview.contract_snapshot, id: tenantId } },
  ])("rejects malformed or internally inconsistent previews %j", async (body) => {
    fetchMock.mockResolvedValueOnce(response(body));
    await expect(repository.previewAssignment(request)).rejects.toThrow("incompatible");
  });
  it("rejects responses for another tenant or request", async () => {
    fetchMock.mockResolvedValueOnce(response({ ...preview, tenant_id: versionId }));
    await expect(repository.previewAssignment(request)).rejects.toThrow("no corresponde");
    fetchMock.mockResolvedValueOnce(response({ ...preview, starts_on: "2028-01-30", first_paid_period: { ...preview.first_paid_period, starts_on: "2028-01-30" } }));
    await expect(repository.previewAssignment(request)).rejects.toThrow("no corresponde");
  });
  it("accepts trial preview without claiming an initial invoice or payment", async () => {
    fetchMock.mockResolvedValueOnce(response({
      ...preview, use_trial: true, trial_end_exclusive: "2028-02-07",
      first_paid_period: { starts_on: "2028-02-07", end_exclusive: "2028-03-07" },
      due_on: "2028-02-07", initial_amount: 0, initial_invoice: false, net: 0, vat: 0,
    }));
    expect(await repository.previewAssignment({ ...request, useTrial: true })).toMatchObject({ initialAmount: 0, createsInvoice: false, resolvedDueOn: "2028-02-07" });
  });
  it("validates confirmation and sends fingerprint, operation and reason rather than a client price", async () => {
    fetchMock.mockResolvedValueOnce(response(result));
    expect(await repository.confirmAssignment(confirmation)).toMatchObject({
      tenantId, planVersionId: versionId, subscriptionId: planId, invoiceId, initialAmount: 11900,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      target_tenant: tenantId, target_version: versionId, starts_on: "2028-01-31", use_trial: false,
      due_on: null, expected_fingerprint: "a".repeat(32), operation_id: tenantId, change_reason: "Nueva contratación",
    });
  });
  it.each([
    null, {}, { ...result, invoice_id: null }, { ...result, initial_amount: 0 },
    { ...result, status: "trial" },
  ])("does not accept a success-shaped incompatible confirmation %j", async (body) => {
    fetchMock.mockResolvedValueOnce(response(body));
    await expect(repository.confirmAssignment(confirmation)).rejects.toThrow();
  });
  it.each([["PGRST202", "VALIDATION"], ["40001", "CONFLICT"], ["23505", "CONFLICT"], ["42501", "UNAUTHORIZED"]])(
    "surfaces RPC error %s explicitly", async (code, expected) => {
      fetchMock.mockResolvedValueOnce(response({ code, message: "database message" }, 400));
      const call = repository.previewAssignment(request);
      if (expected === "VALIDATION") await expect(call).rejects.toThrow("0041 a 0046");
      else await expect(call).rejects.toMatchObject({ code: expected });
    },
  );
  it("preserves historical subscription price, currency and contract name", async () => {
    fetchMock.mockResolvedValueOnce(response({
      tenant_id: tenantId, tenant_name: "Academia", tenant_status: "suspended",
      business_date: "2028-01-31", active_students: 10, active_users: 2, scheduled_change: null,
      subscription: {
        id: invoiceId, plan_id: planId, plan_version_id: versionId, status: "suspended",
        payment_status: "partial", starts_on: "2028-01-01", period_starts_on: "2028-01-01",
        period_end_exclusive: "2028-02-01", next_billing_date: "2028-02-01",
        price: 19.99, currency: "USD", contract_snapshot: { name: "Histórico" },
        duration_unit: "months", duration_count: 1,
      },
    }));
    expect((await repository.getManagement(tenantId)).subscription).toMatchObject({ planName: "Histórico", price: 19.99, currency: "USD", paymentStatus: "partial" });
  });
});
