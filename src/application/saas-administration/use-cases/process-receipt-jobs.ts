import type { ReceiptFilesPort, ReceiptMailPort, ReceiptProcessingPort, ReceiptRendererPort, ReceiptJobOutcome } from "../ports/receipt-processing-port";

export async function processReceiptJobs(deps: {
  jobs: ReceiptProcessingPort; files: ReceiptFilesPort; renderer: ReceiptRendererPort; mail: ReceiptMailPort;
}, batchSize = 5) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) throw new Error("Invalid receipt batch size");
  const result = { processed: 0, failed: 0, unknown: 0 };
  for (let i = 0; i < batchSize; i++) {
    const job = await deps.jobs.claim();
    if (!job) break;
    let outcome: ReceiptJobOutcome;
    let mailAttempted = false;
    try {
      if (job.kind === "receipt_pdf") {
        const bytes = await deps.renderer.render(job.receipt);
        outcome = { status: "succeeded", document: await deps.files.store(job.receipt,bytes) };
      } else {
        if (!job.delivery || !job.document) throw new Error("Incomplete email job");
        const bytes = await deps.files.read(job.document);
        mailAttempted = true;
        const sent = await deps.mail.send({ recipient: job.delivery.recipient,operationId: job.delivery.operationId,
          folio: job.receipt.folio,bytes });
        outcome = sent.status === "accepted" ? { status: "succeeded",providerId: sent.providerId } : sent;
      }
    } catch {
      // An unexpected email failure may follow provider acceptance; never retry it automatically.
      outcome = { status: mailAttempted ? "unknown" : "failed", errorCode: "PROCESSING_ERROR" };
      console.error("SaaS receipt job failed", { jobId: job.id,kind: job.kind,code: outcome.errorCode });
    }
    // A lost acknowledgement leaves the lease for explicit recovery, not a fabricated success.
    await deps.jobs.finish(job,outcome);
    result.processed++;
    if (outcome.status === "failed") result.failed++;
    if (outcome.status === "unknown") result.unknown++;
  }
  return result;
}
