import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseRenewalProcessing } from "./supabase-renewal-processing";

const fetchMock = vi.fn<typeof fetch>();
const repository = new SupabaseRenewalProcessing(createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
}));
const id = "ad470000-0000-4000-8000-000000000001";
const other = "ad470000-0000-4000-8000-000000000002";
const request = { requestId: id, subscriptionId: id, expectedPeriodEnd: "2028-02-29" };
const renewed = {
  status: "renewed", tenant_id: id, subscription_id: id, plan_version_id: id,
  period_starts_on: "2028-02-29", period_end_exclusive: "2028-03-31", due_on: "2028-02-29",
  amount: 11900, invoice_id: id, change_status: null, blocked_reason: null,
};
const status = {
  business_date: "2028-02-29", last_run_at: null, last_worker_run_at: null, due_count: 1,
  failures: [{ subscription_id: id, tenant_id: id, tenant_name: "Academia", period_starts_on: "2028-02-29",
    attempt_count: 3, next_attempt_at: null, error_code: "22023" }], blocked_changes: [],
};
function respond(body: unknown, code = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: code, headers: { "content-type": "application/json" } }));
}
beforeEach(() => fetchMock.mockReset());
describe("renewal RPC contracts", () => {
  it("sends explicit period and request identity and validates the result", async () => {
    respond(renewed);
    expect(await repository.process(request)).toMatchObject({ status: "renewed", periodEndExclusive: "2028-03-31", amount: 11900 });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      request_id: id, target_subscription: id, expected_period_end: "2028-02-29",
    });
  });
  it("accepts a free period without an invoice or invented payment", async () => {
    respond({ ...renewed, amount: 0, invoice_id: null });
    expect(await repository.process(request)).toMatchObject({ status: "renewed", amount: 0, invoiceId: null });
  });
  it("keeps a failed transaction explicit rather than returning success", async () => {
    respond({ status: "failed", tenant_id: id, subscription_id: id, period_starts_on: "2028-02-29", error_code: "22023", message: "Conciliar contrato" });
    expect(await repository.process(request)).toMatchObject({ status: "failed", errorCode: "22023", message: "Conciliar contrato" });
  });
  it("accepts idle only for a batch request", async () => {
    respond({ status: "idle" });
    expect(await repository.process({ ...request, subscriptionId: null, expectedPeriodEnd: null })).toEqual({ status: "idle" });
    respond({ status: "idle" });
    await expect(repository.process(request)).rejects.toThrow("no corresponde");
  });
  it.each([
    null, {}, { ...renewed, invoice_id: null }, { ...renewed, amount: 0 },
    { ...renewed, period_end_exclusive: "2028-02-28" }, { ...renewed, due_on: "2028-02-28" },
    { ...renewed, subscription_id: other }, { ...renewed, period_starts_on: "2028-02-28" },
    { ...renewed, change_status: "blocked", blocked_reason: null },
    { ...renewed, blocked_reason: "Unexpected reason" }, { ...renewed, amount: 1.5 },
  ])("rejects malformed or unrelated renewal result %j", async (body) => {
    respond(body); await expect(repository.process(request)).rejects.toThrow();
  });
  it("maps status without treating absent processing history as a successful deployment", async () => {
    respond(status);
    expect(await repository.getStatus(id)).toMatchObject({ lastRunAt: null, lastWorkerRunAt: null, dueCount: 1, failures: [{ attemptCount: 3, nextAttemptAt: null }] });
  });
  it.each([
    null, {}, { ...status, failures: null }, { ...status, due_count: -1 },
    { ...status, failures: [{ ...status.failures[0], tenant_id: other }] },
    { ...status, failures: [{ ...status.failures[0], next_attempt_at: "2028-03-01T00:00:00Z" }] },
  ])("rejects incompatible status or another tenant %j", async (body) => {
    respond(body); await expect(repository.getStatus(id)).rejects.toThrow();
  });
  it.each([["40001", "CONFLICT"], ["23505", "CONFLICT"], ["42501", "UNAUTHORIZED"]])(
    "surfaces database error %s", async (code, expected) => {
      respond({ code, message: "database details" }, 400);
      await expect(repository.process(request)).rejects.toMatchObject({ code: expected });
    },
  );
  it("provides an actionable missing migration error", async () => {
    respond({ code: "PGRST202", message: "missing" }, 400);
    await expect(repository.getStatus(null)).rejects.toThrow("0047");
  });
});
