import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { BusinessRuleViolationError,UnauthorizedError } from "@/domain/shared/errors";
import { GET } from "./route";
const m = vi.hoisted(() => ({ user: vi.fn(),download: vi.fn() }));
vi.mock("@/infrastructure/composition/auth-composition",() => ({ createAuthDeps: async () => ({ auth: { getCurrentUserId: m.user } }) }));
vi.mock("@/infrastructure/composition/saas-documents-composition",() => ({ downloadAuthorizedSaasReceipt: m.download }));
const id = "ad490000-0000-4000-8000-000000000001";
const get = (receiptId = id) => GET(new Request("http://localhost/api/saas/receipts/id/download"),{ params: Promise.resolve({ receiptId }) });
beforeEach(() => { vi.resetAllMocks(); m.user.mockResolvedValue("user"); vi.spyOn(console,"error").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
describe("private PDF download",() => {
  it("rejects anonymous access before document lookup",async () => {
    m.user.mockResolvedValue(null); expect((await get()).status).toBe(401); expect(m.download).not.toHaveBeenCalled();
  });
  it("rejects malformed identifiers before document lookup",async () => {
    expect((await get("invalid")).status).toBe(404); expect(m.download).not.toHaveBeenCalled();
  });
  it.each([new UnauthorizedError("other tenant"),new BusinessRuleViolationError("not ready")])("does not disclose unavailable content %j",async (error) => {
    m.download.mockRejectedValue(error); const r = await get(); expect(r.status).toBe(error instanceof UnauthorizedError ? 403 : 409);
    expect(await r.text()).not.toContain(error.message);
  });
  it("returns actual PDF bytes with private no-store attachment headers",async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nprivate");
    m.download.mockResolvedValue({ bytes,filename: "comprobante-42.pdf" });
    const r = await get(); expect(r.status).toBe(200); expect(await r.text()).toBe("%PDF-1.7\nprivate");
    expect(r.headers.get("content-type")).toBe("application/pdf"); expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="comprobante-42.pdf"');
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("reports storage failures without claiming payment was reverted",async () => {
    m.download.mockRejectedValue(new Error("private path")); const r = await get(); expect(r.status).toBe(500);
    expect(await r.text()).not.toContain("private path");
  });
});
