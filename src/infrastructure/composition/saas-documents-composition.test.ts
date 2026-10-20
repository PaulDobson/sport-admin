// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/database.types";
import { downloadAuthorizedSaasReceipt } from "./saas-documents-composition";
const m = vi.hoisted(() => ({ rpcFetch: vi.fn<typeof fetch>(),service: vi.fn(),read: vi.fn() }));
vi.mock("@/infrastructure/supabase/server-client",() => ({ createSupabaseServerClient: async () =>
  createClient<Database>("https://test.supabase.co","anon-key",{ global: { fetch: m.rpcFetch },auth: { persistSession: false,autoRefreshToken: false } }) }));
vi.mock("@/infrastructure/supabase/service-role-client",() => ({ createSupabaseServiceRoleClient: m.service }));
vi.mock("@/infrastructure/saas-administration/receipt-files",() => ({ SupabaseReceiptFiles: class { read = m.read; } }));
const id = "ad490000-0000-4000-8000-000000000001";
beforeEach(() => vi.resetAllMocks());
describe("document authorization precedes privileged storage",() => {
  it("does not create a privileged client for denied owner/cross-tenant/revoked access",async () => {
    m.rpcFetch.mockResolvedValue(Response.json({ code: "42501",message: "Receipt unavailable" },{ status: 403 }));
    await expect(downloadAuthorizedSaasReceipt(id)).rejects.toThrow(); expect(m.service).not.toHaveBeenCalled(); expect(m.read).not.toHaveBeenCalled();
  });
  it("rejects wrong document identity before privileged storage",async () => {
    m.rpcFetch.mockResolvedValue(Response.json({ receipt_id: id,folio: 1,storage_path: "another/v1.pdf",sha256: "a".repeat(64),byte_size: 20 }));
    await expect(downloadAuthorizedSaasReceipt(id)).rejects.toThrow(); expect(m.service).not.toHaveBeenCalled();
  });
  it("passes only authorized private metadata to storage and returns a safe folio filename",async () => {
    const document = { receipt_id: id,folio: 42,storage_path: `${id}/v1.pdf`,sha256: "a".repeat(64),byte_size: 20 };
    m.rpcFetch.mockResolvedValue(Response.json(document)); m.read.mockResolvedValue(new Uint8Array([1,2]));
    expect(await downloadAuthorizedSaasReceipt(id)).toEqual({ bytes: new Uint8Array([1,2]),filename: "comprobante-42.pdf" });
    expect(m.rpcFetch.mock.invocationCallOrder[0]).toBeLessThan(m.service.mock.invocationCallOrder[0]);
    expect(m.read).toHaveBeenCalledWith({ ...document,content_type: "application/pdf" });
  });
});
