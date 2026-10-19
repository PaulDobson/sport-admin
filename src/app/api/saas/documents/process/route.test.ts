import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { POST } from "./route";
const m = vi.hoisted(() => ({ configuration: vi.fn(),secret: vi.fn(),deps: vi.fn(),process: vi.fn() }));
vi.mock("@/infrastructure/composition/saas-documents-composition",() => ({
  getSaasDocumentAuthorizationSecret: m.secret,getSaasDocumentConfiguration: m.configuration,createSaasDocumentWorkerDeps: m.deps,
}));
vi.mock("@/application/saas-administration/use-cases/process-receipt-jobs",() => ({ processReceiptJobs: m.process }));
const request = (authorization?: string) => new Request("http://localhost/api/saas/documents/process",{
  method: "POST",headers: authorization ? { authorization } : {},
});
beforeEach(() => {
  vi.resetAllMocks(); m.secret.mockReturnValue("private-document-secret");
  m.configuration.mockReturnValue({ enabled: true }); m.deps.mockReturnValue({ worker: true });
  m.process.mockResolvedValue({ processed: 0,failed: 0,unknown: 0 });
  vi.spyOn(console,"error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
describe("protected receipt worker",() => {
  it.each([undefined,"Basic credentials","Bearer wrong","Bearer private-document-secrex"])("rejects %s without privileged access",async (auth) => {
    expect((await POST(request(auth))).status).toBe(401); expect(m.deps).not.toHaveBeenCalled();
  });
  it("stays disabled without claiming work",async () => {
    m.configuration.mockReturnValue({ enabled: false }); expect((await POST(request("Bearer private-document-secret"))).status).toBe(503);
    expect(m.process).not.toHaveBeenCalled();
  });
  it("processes the default bounded batch only after authentication",async () => {
    expect((await POST(request("Bearer private-document-secret"))).status).toBe(200);
    expect(m.process).toHaveBeenCalledWith({ worker: true });
  });
  it.each([{ failed: 1,unknown: 0 },{ failed: 0,unknown: 1 }])("surfaces unsuccessful persisted outcomes %j",async (result) => {
    m.process.mockResolvedValue({ processed: 1,...result }); expect((await POST(request("Bearer private-document-secret"))).status).toBe(207);
  });
  it("does not leak credentials or snapshots on unexpected errors",async () => {
    m.process.mockRejectedValue(new Error("private-secret recipient@example.invalid"));
    const r = await POST(request("Bearer private-document-secret")); expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("recipient");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private-secret");
  });
});
