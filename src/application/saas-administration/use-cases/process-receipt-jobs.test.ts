import { afterEach,describe,expect,it,vi } from "vitest";
import { receiptFixture } from "@/domain/saas-administration/payment-receipt.fixture";
import type { ReceiptJob,ReceiptFilesPort,ReceiptMailPort,ReceiptProcessingPort,ReceiptRendererPort } from "../ports/receipt-processing-port";
import { processReceiptJobs } from "./process-receipt-jobs";
const job: ReceiptJob = { id: receiptFixture.id,leaseToken: receiptFixture.id,kind: "receipt_pdf",receipt: receiptFixture,document: null,delivery: null };
function deps() {
  return {
    jobs: { claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValue(null),finish: vi.fn().mockResolvedValue(undefined) } satisfies ReceiptProcessingPort,
    renderer: { render: vi.fn().mockResolvedValue(new Uint8Array([1,2])) } satisfies ReceiptRendererPort,
    files: { store: vi.fn().mockResolvedValue({ path: `${receiptFixture.id}/v1.pdf`,hash: "a".repeat(64),size: 2 }),read: vi.fn().mockResolvedValue(new Uint8Array([1,2])) } satisfies ReceiptFilesPort,
    mail: { send: vi.fn().mockResolvedValue({ status: "accepted",providerId: "provider-1" }) } satisfies ReceiptMailPort,
  };
}
const emailJob: ReceiptJob = { ...job,kind: "receipt_email",
  delivery: { id: job.id,recipient: "owner@example.invalid",operationId: job.id },
  document: { receipt_id: job.id,storage_path: `${job.id}/v1.pdf`,sha256: "a".repeat(64),byte_size: 2,content_type: "application/pdf" } };
afterEach(() => vi.restoreAllMocks());
describe("bounded document processing",() => {
  it("persists real document metadata with the leased job identity",async () => {
    const d = deps(); expect(await processReceiptJobs(d)).toEqual({ processed: 1,failed: 0,unknown: 0 });
    expect(d.jobs.finish).toHaveBeenCalledWith(job,{ status: "succeeded",document: { path: `${job.id}/v1.pdf`,hash: "a".repeat(64),size: 2 } });
    expect(d.mail.send).not.toHaveBeenCalled();
  });
  it.each(["render","upload"])("records %s failure without any payment write or email",async (source) => {
    const d = deps(); vi.spyOn(console,"error").mockImplementation(() => {});
    (source === "render" ? d.renderer.render : d.files.store).mockRejectedValueOnce(new Error("offline"));
    expect(await processReceiptJobs(d)).toEqual({ processed: 1,failed: 1,unknown: 0 });
    expect(d.jobs.finish).toHaveBeenCalledWith(job,{ status: "failed",errorCode: "PROCESSING_ERROR" });
    expect(d.mail.send).not.toHaveBeenCalled();
  });
  it("does not hide lost finish acknowledgement or claim new work",async () => {
    const d = deps(); d.jobs.finish.mockRejectedValueOnce(new Error("connection lost"));
    await expect(processReceiptJobs(d)).rejects.toThrow("connection lost"); expect(d.jobs.claim).toHaveBeenCalledOnce();
  });
  it("reports provider acceptance, never delivery",async () => {
    const d = deps(); d.jobs.claim.mockReset().mockResolvedValueOnce(emailJob).mockResolvedValue(null);
    await processReceiptJobs(d);
    expect(d.jobs.finish).toHaveBeenCalledWith(emailJob,{ status: "succeeded",providerId: "provider-1" });
    expect(d.mail.send).toHaveBeenCalledWith({ recipient: emailJob.delivery?.recipient,operationId: job.id,folio: 1,bytes: new Uint8Array([1,2]) });
    expect(d.renderer.render).not.toHaveBeenCalled();
  });
  it("records pre-send storage failures as failed, not an ambiguous provider acceptance",async () => {
    const d = deps(); d.jobs.claim.mockReset().mockResolvedValueOnce(emailJob).mockResolvedValue(null);
    d.files.read.mockRejectedValue(new Error("storage offline")); vi.spyOn(console,"error").mockImplementation(() => {});
    expect(await processReceiptJobs(d)).toEqual({ processed: 1,failed: 1,unknown: 0 });
    expect(d.mail.send).not.toHaveBeenCalled();
  });
  it.each(["unknown","failed"] as const)("persists explicit mail %s for operator recovery",async (status) => {
    const d = deps(); d.jobs.claim.mockReset().mockResolvedValueOnce(emailJob).mockResolvedValue(null);
    d.mail.send.mockResolvedValue({ status,errorCode: "MAIL_ERROR" });
    const result = await processReceiptJobs(d); expect(result[status]).toBe(1);
    expect(d.jobs.finish).toHaveBeenCalledWith(emailJob,{ status,errorCode: "MAIL_ERROR" });
  });
  it("treats an unexpected mail exception as unknown and logs no recipient or secrets",async () => {
    const d = deps(); d.jobs.claim.mockReset().mockResolvedValueOnce(emailJob).mockResolvedValue(null);
    d.mail.send.mockRejectedValue(new Error("private provider response")); const log = vi.spyOn(console,"error").mockImplementation(() => {});
    expect((await processReceiptJobs(d)).unknown).toBe(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain("private"); expect(JSON.stringify(log.mock.calls)).not.toContain("@");
  });
  it("stops at exactly the batch bound",async () => {
    const d = deps(); d.jobs.claim.mockReset().mockResolvedValue(job);
    expect((await processReceiptJobs(d,3)).processed).toBe(3); expect(d.jobs.claim).toHaveBeenCalledTimes(3);
  });
  it.each([0,-1,11,1.5,NaN])("rejects invalid batch %s without claiming",async (size) => {
    const d = deps(); await expect(processReceiptJobs(d,size)).rejects.toThrow("Invalid"); expect(d.jobs.claim).not.toHaveBeenCalled();
  });
});
