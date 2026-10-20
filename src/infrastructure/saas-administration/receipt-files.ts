import { createHash } from "node:crypto";
import type { ReceiptFilesPort } from "@/application/saas-administration/ports/receipt-processing-port";
import type { ReceiptCore, ReceiptDocument } from "@/domain/saas-administration/payment-receipt";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function validatePdf(bytes: Uint8Array) {
  if (bytes.byteLength === 0 || bytes.byteLength > 10485760 || Buffer.from(bytes.subarray(0,5)).toString() !== "%PDF-") throw new Error("Invalid PDF file");
}
export class SupabaseReceiptFiles implements ReceiptFilesPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async store(receipt: ReceiptCore,bytes: Uint8Array) {
    validatePdf(bytes);
    const path = `${receipt.id}/v1.pdf`;
    const storage = this.client.storage.from("saas-receipts");
    const { error } = await storage.upload(path,bytes,{ contentType: "application/pdf",upsert: false });
    if (error) {
      if (error.statusCode !== "409" && error.statusCode !== "400") throw error;
      // Recovered upload must match deterministic bytes from the immutable snapshot.
      const { data: existing,error: readError } = await storage.download(path);
      if (readError) throw readError;
      if (hash(new Uint8Array(await existing.arrayBuffer())) !== hash(bytes)) throw new Error("Stored receipt hash mismatch");
    }
    return { path,hash: hash(bytes),size: bytes.byteLength };
  }
  async read(document: ReceiptDocument) {
    if (document.storage_path !== `${document.receipt_id}/v1.pdf`) throw new Error("Unexpected receipt path");
    const { data,error } = await this.client.storage.from("saas-receipts").download(document.storage_path);
    if (error) throw error;
    const bytes = new Uint8Array(await data.arrayBuffer());
    validatePdf(bytes);
    if (bytes.byteLength !== document.byte_size || hash(bytes) !== document.sha256) throw new Error("Receipt integrity check failed");
    return bytes;
  }
}
