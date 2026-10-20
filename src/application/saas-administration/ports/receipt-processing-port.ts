import type { ReceiptCore, ReceiptDocument } from "@/domain/saas-administration/payment-receipt";

export interface ReceiptJob {
  id: string; kind: "receipt_pdf" | "receipt_email"; leaseToken: string;
  receipt: ReceiptCore; document: ReceiptDocument | null;
  delivery: { id: string; recipient: string; operationId: string } | null;
}
export interface ReceiptJobOutcome {
  status: "succeeded" | "failed" | "unknown";
  document?: { path: string; hash: string; size: number };
  providerId?: string;
  errorCode?: string;
}
export interface ReceiptProcessingPort {
  claim(): Promise<ReceiptJob | null>;
  finish(job: ReceiptJob, outcome: ReceiptJobOutcome): Promise<void>;
}
export interface ReceiptFilesPort {
  store(receipt: ReceiptCore, bytes: Uint8Array): Promise<{ path: string; hash: string; size: number }>;
  read(document: ReceiptDocument): Promise<Uint8Array>;
}
export interface ReceiptRendererPort { render(receipt: ReceiptCore): Promise<Uint8Array> }
export interface ReceiptMailPort {
  send(input: { recipient: string; folio: number; operationId: string; bytes: Uint8Array }): Promise<
    { status: "accepted"; providerId: string } | { status: "failed" | "unknown"; errorCode: string }
  >;
}
