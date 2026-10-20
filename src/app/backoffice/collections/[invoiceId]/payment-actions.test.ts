import { beforeEach,describe,expect,it,vi } from "vitest";
import { paymentAction } from "./payment-actions";
import { ConflictError } from "@/domain/shared/errors";
const m = vi.hoisted(() => ({ user: vi.fn(),admin: vi.fn(),pay: vi.fn(),voidInvoice: vi.fn(),revalidate: vi.fn() }));
vi.mock("@/infrastructure/composition/auth-composition",() => ({ createAuthDeps: async () => ({ auth: { getCurrentUserId: m.user } }) }));
vi.mock("@/infrastructure/composition/saas-administration-composition",() => ({ createSaasAdministrationDeps: async () => ({
  billingPayments: { isPlatformAdmin: m.admin,pay: m.pay,voidInvoice: m.voidInvoice },
}) }));
vi.mock("next/cache",() => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation",() => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
const id = "ad490000-0000-4000-8000-000000000001";
const initial = { error: null,fieldErrors: {},result: null,voided: false };
const form = () => {
  const data = new FormData();
  for (const [key,value] of Object.entries({ invoiceId: id,operationId: id,intent: "pay",amount: "11900",
    paidOn: "2026-10-18",method: "cash",reason: "Verified cash",accepted: "on" })) data.set(key,value);
  return data;
};
beforeEach(() => { vi.resetAllMocks(); m.user.mockResolvedValue("admin"); m.admin.mockResolvedValue(true);
  m.pay.mockResolvedValue({ invoiceId: id,tenantId: id,chargeId: id,receiptId: id,amount: 11900,status: "paid" }); });
describe("payment server action",() => {
  it("redirects anonymous requests before creating a payment",async () => {
    m.user.mockResolvedValue(null); await expect(paymentAction(initial,form())).rejects.toThrow("REDIRECT:/log-in"); expect(m.pay).not.toHaveBeenCalled();
  });
  it("rejects an unchecked confirmation and missing monetary amount",async () => {
    const data = form(); data.delete("accepted"); expect((await paymentAction(initial,data)).fieldErrors.accepted).toBeTruthy();
    data.set("accepted","on"); data.set("amount",""); expect((await paymentAction(initial,data)).fieldErrors.amount).toBeTruthy();
    expect(m.pay).not.toHaveBeenCalled();
  });
  it("revalidates nested admin routes and owner billing after confirmed settlement",async () => {
    expect((await paymentAction(initial,form())).result?.status).toBe("paid");
    expect(m.pay).toHaveBeenCalledWith(expect.objectContaining({ amount: 11900,operationId: id,reference: null }));
    expect(m.revalidate).toHaveBeenCalledWith("/backoffice","layout"); expect(m.revalidate).toHaveBeenCalledWith("/billing");
  });
  it("surfaces stale balance without success or cache revalidation",async () => {
    m.pay.mockRejectedValue(new ConflictError("Saldo cambió")); const state = await paymentAction(initial,form());
    expect(state.error).toBe("Saldo cambió"); expect(state.result).toBeNull(); expect(m.revalidate).not.toHaveBeenCalled();
  });
  it("authorizes and audits void through its dedicated use case, without creating a charge",async () => {
    const data = form(); data.set("intent","void"); expect((await paymentAction(initial,data)).voided).toBe(true);
    expect(m.voidInvoice).toHaveBeenCalledWith({ invoiceId: id,operationId: id,reason: "Verified cash" }); expect(m.pay).not.toHaveBeenCalled();
  });
});
