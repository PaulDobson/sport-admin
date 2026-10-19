import { describe,expect,it,vi } from "vitest";
import type { BillingPaymentsPort } from "../ports/billing-payments-port";
import { recordSaasPayment,voidSaasInvoice,requestSaasReceiptDelivery,retrySaasReceiptPdf,reconcileSaasReceiptDelivery } from "./manage-billing-payments";
import { UnauthorizedError,ValidationError } from "@/domain/shared/errors";
const id = "ad490000-0000-4000-8000-000000000001";
const valid = { invoiceId: id,operationId: id,amount: 11900,paidOn: "2026-10-18",method: "transfer",reference: "TRANSFER-1",reason: "Pago validado" };
function port(): BillingPaymentsPort {
  return { isPlatformAdmin: vi.fn().mockResolvedValue(true),pay: vi.fn(),voidInvoice: vi.fn(),getReceipt: vi.fn(),
    listReceipts: vi.fn(),requestDelivery: vi.fn(),retryPdf: vi.fn(),reconcileDelivery: vi.fn() };
}
describe("manual billing commands",() => {
  it("authorizes before validating or writing",async () => {
    const p = port(); vi.mocked(p.isPlatformAdmin).mockResolvedValue(false);
    for (const execute of [() => recordSaasPayment({},p),() => voidSaasInvoice({},p),() => requestSaasReceiptDelivery({},p),
      () => retrySaasReceiptPdf("",p),() => reconcileSaasReceiptDelivery({},p)]) await expect(execute()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(p.pay).not.toHaveBeenCalled(); expect(p.reconcileDelivery).not.toHaveBeenCalled();
  });
  it.each([0,-1,0.5,10000000000,NaN,Infinity])("rejects invalid amount %s",async (amount) => {
    const p = port(); await expect(recordSaasPayment({ ...valid,amount },p)).rejects.toBeInstanceOf(ValidationError);
    expect(p.pay).not.toHaveBeenCalled();
  });
  it.each([{ method: "transfer",reference: null },{ method: "external_card",reference: "  " },{ paidOn: "2026-02-30" },
    { operationId: "invalid" },{ reason: " " }])("rejects invalid payment %j",async (change) => {
    await expect(recordSaasPayment({ ...valid,...change },port())).rejects.toBeInstanceOf(ValidationError);
  });
  it("accepts cash without reference and trims text without changing money or operation",async () => {
    const p = port();
    await recordSaasPayment({ ...valid,method: "cash",reference: null,reason: "  Pago validado  " },p);
    expect(p.pay).toHaveBeenCalledWith({ ...valid,method: "cash",reference: null });
  });
  it("validates the same operation identity for void",async () => {
    const p = port(); await voidSaasInvoice(valid,p);
    expect(p.voidInvoice).toHaveBeenCalledWith({ invoiceId: id,operationId: id,reason: valid.reason });
  });
  it("requires explicit approval for primary-contact fallback",async () => {
    const p = port(); const input = { receiptId: id,operationId: id,recipient: "owner@example.invalid",source: "primary_contact",fallbackApproved: false };
    await expect(requestSaasReceiptDelivery(input,p)).rejects.toBeInstanceOf(ValidationError);
    expect(p.requestDelivery).not.toHaveBeenCalled();
    await requestSaasReceiptDelivery({ ...input,fallbackApproved: true },p); expect(p.requestDelivery).toHaveBeenCalledOnce();
  });
  it.each([{ providerId: null,notSent: false },{ providerId: "mail-id",notSent: true },{ providerId: "",notSent: false }])("rejects ambiguous reconciliation %j",async (input) => {
    await expect(reconcileSaasReceiptDelivery({ deliveryId: id,reason: "Verificado",...input },port())).rejects.toBeInstanceOf(ValidationError);
  });
  it("records verified provider acknowledgement without fabricating delivery",async () => {
    const p = port(); const input = { deliveryId: id,providerId: "mail-id",notSent: false,reason: "Verificado en proveedor" };
    await reconcileSaasReceiptDelivery(input,p); expect(p.reconcileDelivery).toHaveBeenCalledWith(input);
  });
});
