// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { createHash } from "node:crypto";
import type { Database } from "@/infrastructure/supabase/database.types";
import { receiptFixture } from "@/domain/saas-administration/payment-receipt.fixture";
import { SupabaseBillingPayments } from "./supabase-billing-payments";
import { SupabaseReceiptProcessing } from "./supabase-receipt-processing";
import { SupabaseOwnerBilling } from "./supabase-owner-billing";
import { SupabaseFinancialLedger } from "./supabase-financial-ledger";
import { SupabaseReceiptFiles } from "./receipt-files";
const request = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co","test-anon",{ global: { fetch: request },auth: { persistSession: false,autoRefreshToken: false } });
const payments = new SupabaseBillingPayments(client); const jobs = new SupabaseReceiptProcessing(client);
const response = (body: unknown,status = 200) => Response.json(body,{ status });
const id = receiptFixture.id, otherId = receiptFixture.tenant_id;
const input = { invoiceId: id,amount: 11900,paidOn: "2026-10-18",method: "cash" as const,reference: null,operationId: otherId,reason: "Pago recibido" };
const result = { invoice_id: id,tenant_id: otherId,charge_id: id,receipt_id: id,amount: 11900,status: "paid" };
const owner = { tenant_id: id,tenant_name: "Academia",tenant_status: "suspended",owner_tenants: [{ id,name: "Academia" }],balances: [],
  subscription: null,scheduled_change: null,page: 1,total: 0,invoices: [] };
beforeEach(() => request.mockReset());
describe("payment/document runtime contracts",() => {
  it("passes every payment field to the atomic RPC and validates identity",async () => {
    request.mockResolvedValueOnce(response(result)); expect(await payments.pay(input)).toMatchObject({ receiptId: id,status: "paid" });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ target_invoice: id,expected_amount: 11900,
      paid_on: input.paidOn,payment_method: "cash",payment_reference: null,operation_id: otherId,change_reason: input.reason });
  });
  it.each([{ amount: 1 },{ invoice_id: otherId },{ receipt_id: null },{ status: "pending" }])("rejects malformed or wrong payment confirmation %j",async (patch) => {
    request.mockResolvedValueOnce(response({ ...result,...patch })); await expect(payments.pay(input)).rejects.toThrow();
  });
  it.each([["PGRST202","0049"],["40001","cambió"],["23514","Verifica"],["42501","acceso"]])("surfaces RPC error %s",async (code,message) => {
    request.mockResolvedValueOnce(response({ code,message: "database detail" },400)); await expect(payments.pay(input)).rejects.toThrow(new RegExp(message,"i"));
  });
  it("does not invent idle work from an incomplete response",async () => {
    request.mockResolvedValueOnce(response({})); await expect(jobs.claim()).rejects.toThrow("incompatible");
    request.mockResolvedValueOnce(response({ job: null })); expect(await jobs.claim()).toBeNull();
  });
  it("rejects a job pointing to another receipt",async () => {
    request.mockResolvedValueOnce(response({ job: { id,kind: "receipt_pdf",lease_token: id,receipt_id: otherId,delivery_id: null },receipt: receiptFixture,document: null,delivery: null }));
    await expect(jobs.claim()).rejects.toThrow("identity mismatch");
  });
  it("keeps owner read access independent of operational tenant status",async () => {
    request.mockResolvedValueOnce(response(owner)); expect((await new SupabaseOwnerBilling(client).get(id,1)).tenant_status).toBe("suspended");
  });
  it.each([{ tenant_id: otherId },{ page: 2 }])("rejects owner response from another tenant/page %j",async (patch) => {
    request.mockResolvedValueOnce(response({ ...owner,...patch })); await expect(new SupabaseOwnerBilling(client).get(id,1)).rejects.toThrow("no corresponde");
  });
  it("preserves signed refunds and fractional historical MRR without currency conversion",async () => {
    const data = { period: "2026-10-01",currency: "USD",metric: "collected" as const,page: 1,total: 1,amount: -19.99,
      entries: [{ id,tenant_id: otherId,tenant_name: "Academia",invoice_id: id,label: "Reembolso",event_at: null,amount: -19.99 }] };
    request.mockResolvedValueOnce(response(data)); expect(await new SupabaseFinancialLedger(client).get(data)).toEqual(data);
  });
});
describe("private receipt storage integrity",() => {
  const files = new SupabaseReceiptFiles(client);
  const bytes = new TextEncoder().encode("%PDF-1.7\nreceipt");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const document = { receipt_id: id,storage_path: `${id}/v1.pdf`,sha256,byte_size: bytes.length,content_type: "application/pdf" as const };
  it("uploads without overwrite and never creates a public URL",async () => {
    request.mockResolvedValueOnce(response({ Key: `saas-receipts/${id}/v1.pdf` }));
    expect(await files.store(receiptFixture,bytes)).toEqual({ path: document.storage_path,hash: sha256,size: bytes.length });
    const [url,init] = request.mock.calls[0]; expect(String(url)).toContain(`/storage/v1/object/saas-receipts/${id}/v1.pdf`);
    expect(new Headers(init?.headers).get("x-upsert")).toBe("false"); expect(String(url)).not.toContain("/public/");
  });
  it("recovers a lost upload acknowledgement only if stored hash matches",async () => {
    request.mockResolvedValueOnce(response({ statusCode: "409",error: "Duplicate",message: "exists" },409))
      .mockResolvedValueOnce(new Response(bytes));
    expect((await files.store(receiptFixture,bytes)).hash).toBe(sha256);
  });
  it("rejects a conflicting stored document instead of overwriting it",async () => {
    request.mockResolvedValueOnce(response({ statusCode: "409",error: "Duplicate",message: "exists" },409))
      .mockResolvedValueOnce(new Response("%PDF-different"));
    await expect(files.store(receiptFixture,bytes)).rejects.toThrow("hash mismatch");
  });
  it("verifies hash and exact size on every download",async () => {
    request.mockResolvedValueOnce(new Response(bytes)); expect(await files.read(document)).toEqual(bytes);
    request.mockResolvedValueOnce(new Response("%PDF-tampered")); await expect(files.read(document)).rejects.toThrow("integrity");
  });
  it("rejects cross-document paths and non-PDF content before upload",async () => {
    await expect(files.read({ ...document,storage_path: `${otherId}/v1.pdf` })).rejects.toThrow("path");
    await expect(files.store(receiptFixture,new Uint8Array([1,2]))).rejects.toThrow("PDF"); expect(request).not.toHaveBeenCalled();
  });
});
