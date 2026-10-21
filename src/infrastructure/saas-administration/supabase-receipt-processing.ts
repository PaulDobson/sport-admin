import { z } from "zod";
import type {
  ReceiptProcessingPort,
  ReceiptJob,
  ReceiptJobOutcome,
} from "@/application/saas-administration/ports/receipt-processing-port";
import {
  receiptCoreSchema,
  receiptDocumentSchema,
} from "@/domain/saas-administration/payment-receipt";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import { parseBillingContract } from "./billing-rpc-contract";

export class SupabaseReceiptProcessing implements ReceiptProcessingPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async claim(): Promise<ReceiptJob | null> {
    const { data, error } = await this.client.rpc("claim_saas_billing_job");
    if (error) throw error;
    const result = parseBillingContract(
      z.discriminatedUnion("idle", [
        z.object({ idle: z.literal(true), job: z.null() }),
        z.object({
          idle: z.literal(false),
          job: z.object({
            id: z.uuid(),
            kind: z.enum(["receipt_pdf", "receipt_email"]),
            lease_token: z.uuid(),
            receipt_id: z.uuid(),
            delivery_id: z.uuid().nullable(),
          }),
          receipt: receiptCoreSchema,
          document: receiptDocumentSchema.nullable(),
          delivery: z
            .object({
              id: z.uuid(),
              recipient: z.email(),
              operation_id: z.uuid(),
            })
            .nullable(),
        }),
      ]),
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? { ...data, idle: data.job === null }
        : data,
    );
    if (result.idle) return null;
    if (
      result.job.receipt_id !== result.receipt.id ||
      (result.document && result.document.receipt_id !== result.receipt.id) ||
      result.job.delivery_id !== (result.delivery?.id ?? null) ||
      (result.job.kind === "receipt_email" &&
        (!result.document || !result.delivery))
    )
      throw new Error("Receipt job identity mismatch");
    return {
      id: result.job.id,
      kind: result.job.kind,
      leaseToken: result.job.lease_token,
      receipt: result.receipt,
      document: result.document,
      delivery: result.delivery
        ? {
            id: result.delivery.id,
            recipient: result.delivery.recipient,
            operationId: result.delivery.operation_id,
          }
        : null,
    };
  }
  async finish(job: ReceiptJob, outcome: ReceiptJobOutcome) {
    const { data, error } = await this.client.rpc("finish_saas_billing_job", {
      target_job: job.id,
      target_lease: job.leaseToken,
      outcome: outcome.status,
      document_path: outcome.document?.path ?? undefined,
      document_hash: outcome.document?.hash ?? undefined,
      document_size: outcome.document?.size ?? undefined,
      provider_id: outcome.providerId ?? undefined,
      error_code: outcome.errorCode ?? undefined,
    });
    if (error) throw error;
    parseBillingContract(
      z.object({
        status: z.enum(["queued", "succeeded", "failed", "unknown"]),
      }),
      data,
    );
  }
}
