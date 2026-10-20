import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseSubscriptionManagement } from "./supabase-subscription-management";

const fetchMock = vi.fn<typeof fetch>();
const repository = new SupabaseSubscriptionManagement(createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
}));
const tenantId = "ad460000-0000-4000-8000-000000000001";
const versionId = "ad460000-0000-4000-8000-000000000002";
const invoiceId = "ad460000-0000-4000-8000-000000000003";
const request = { tenantId, planVersionId: versionId };
const confirmation = { ...request, operationId: tenantId, fingerprint: "a".repeat(32), reason: "Cambio solicitado" };
const preview = {
  tenant_id: tenantId, subscription_id: tenantId, current_version_id: tenantId, current_plan_name: "Base",
  plan_version_id: versionId, plan_name: "Pro", version_number: 1, fingerprint: "a".repeat(32),
  kind: "upgrade", business_date: "2028-01-21", effective_on: "2028-01-21",
  period_starts_on: "2028-01-01", period_end_exclusive: "2028-01-31", remaining_days: 10,
  current_rate_numerator: "30000", current_rate_denominator: "30",
  new_rate_numerator: "60000", new_rate_denominator: "30",
  amount_due: 10000, net: 8403, vat: 1597, price: 60000, currency: "CLP",
  duration_unit: "days", duration_count: 30, active_students: 10, active_users: 2,
  max_students: 100, max_users: 5, features: ["reports"], services: ["Soporte"],
};
const result = {
  tenant_id: tenantId, subscription_id: tenantId, plan_version_id: versionId,
  kind: "upgrade", effective_on: "2028-01-21", amount_due: 10000, invoice_id: invoiceId, scheduled_change_id: null,
};
const respond = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
);
beforeEach(() => fetchMock.mockReset());
describe("plan change runtime contracts", () => {
  it("verifies the exact 30k to 60k, 10/30 day proration independently", async () => {
    respond(preview);
    expect(await repository.previewPlanChange(request)).toMatchObject({ amountDue: 10000, remainingDays: 10, kind: "upgrade", periodEndExclusive: "2028-01-31" });
  });
  it("charges only the incremental tariff on a successive upgrade", async () => {
    respond({ ...preview, current_rate_numerator: "60000", price: 90000, new_rate_numerator: "90000" });
    expect((await repository.previewPlanChange(request)).amountDue).toBe(10000);
  });
  it("accepts zero-rounded upgrade without inventing debt", async () => {
    respond({ ...preview, current_rate_numerator: "1", current_rate_denominator: "30",
      price: 1, duration_count: 29, new_rate_numerator: "1", new_rate_denominator: "29",
      amount_due: 0, net: 0, vat: 0 });
    expect((await repository.previewPlanChange(request)).amountDue).toBe(0);
  });
  it("keeps downgrade at renewal without refund", async () => {
    respond({ ...preview, kind: "downgrade", effective_on: "2028-01-31", price: 15000,
      new_rate_numerator: "15000", amount_due: 0, net: 0, vat: 0 });
    expect(await repository.previewPlanChange(request)).toMatchObject({ kind: "downgrade", effectiveOn: "2028-01-31", amountDue: 0 });
  });
  it.each([
    null, {}, { ...preview, currency: "USD" }, { ...preview, amount_due: 10001 },
    { ...preview, net: 8404 }, { ...preview, vat: 1598 }, { ...preview, effective_on: "2028-01-22" },
    { ...preview, current_rate_denominator: "0" }, { ...preview, current_rate_numerator: "30000.1" },
    { ...preview, new_rate_numerator: "60001" }, { ...preview, remaining_days: 11 },
    { ...preview, active_students: 101 }, { ...preview, kind: "downgrade" },
    { ...preview, tenant_id: versionId },
  ])("rejects incompatible or tampered quote %j", async (body) => {
    respond(body);
    await expect(repository.previewPlanChange(request)).rejects.toThrow();
  });
  it("confirms using operation and fingerprint, never a client amount", async () => {
    respond(result);
    expect(await repository.confirmPlanChange(confirmation)).toMatchObject({ invoiceId, amountDue: 10000 });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      target_tenant: tenantId, target_version: versionId, expected_fingerprint: confirmation.fingerprint,
      operation_id: tenantId, change_reason: confirmation.reason,
    });
  });
  it.each([
    { ...result, invoice_id: null }, { ...result, amount_due: 0 }, { ...result, scheduled_change_id: invoiceId },
    { ...result, kind: "downgrade" }, { ...result, tenant_id: versionId },
  ])("rejects success-shaped invalid result %j", async (body) => {
    respond(body);
    await expect(repository.confirmPlanChange(confirmation)).rejects.toThrow();
  });
  it("requires a matching cancellation result", async () => {
    respond({ tenant_id: tenantId, scheduled_change_id: invoiceId, status: "cancelled" });
    await repository.cancelPlanChange({ tenantId, scheduledChangeId: invoiceId, operationId: tenantId, reason: "Cancelar" });
    respond({ tenant_id: tenantId, scheduled_change_id: versionId, status: "cancelled" });
    await expect(repository.cancelPlanChange({ tenantId, scheduledChangeId: invoiceId, operationId: tenantId, reason: "Cancelar" })).rejects.toThrow();
  });
  it("surfaces stale SQL previews", async () => {
    respond({ code: "40001", message: "stale" }, 400);
    await expect(repository.confirmPlanChange(confirmation)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
