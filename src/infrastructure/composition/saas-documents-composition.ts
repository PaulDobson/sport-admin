import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { getSaasDocumentReadiness,getSaasDocumentWorkerSecret,getSaasReceiptMailConfig } from "@/infrastructure/supabase/env";
import { SupabaseReceiptProcessing } from "@/infrastructure/saas-administration/supabase-receipt-processing";
import { SupabaseReceiptFiles } from "@/infrastructure/saas-administration/receipt-files";
import { ReceiptPdfRenderer } from "@/infrastructure/saas-administration/receipt-pdf";
import { ResendReceiptMail } from "@/infrastructure/saas-administration/resend-receipt-mail";
import { parseBillingContract } from "@/infrastructure/saas-administration/billing-rpc-contract";
import { throwPaymentRpcError } from "@/infrastructure/saas-administration/supabase-billing-payments";

export const getSaasDocumentConfiguration = getSaasDocumentReadiness;
export const getSaasDocumentAuthorizationSecret = getSaasDocumentWorkerSecret;
export function createSaasDocumentWorkerDeps() {
  const client = createSupabaseServiceRoleClient();
  return { jobs: new SupabaseReceiptProcessing(client),files: new SupabaseReceiptFiles(client),
    renderer: new ReceiptPdfRenderer(),mail: new ResendReceiptMail(getSaasDocumentReadiness().mailConfigured ? getSaasReceiptMailConfig() : null) };
}
export async function downloadAuthorizedSaasReceipt(id: string) {
  const client = await createSupabaseServerClient();
  const { data,error } = await client.rpc("authorize_saas_receipt_download",{ target_receipt: id });
  if (error) throwPaymentRpcError(error);
  const document = parseBillingContract(z.object({ receipt_id: z.literal(id),folio: z.number().int().positive(),
    storage_path: z.literal(`${id}/v1.pdf`),sha256: z.string().regex(/^[a-f0-9]{64}$/),byte_size: z.number().int().positive().max(10485760) }),data);
  // Privileged storage access is created only after document-level user authorization.
  const files = new SupabaseReceiptFiles(createSupabaseServiceRoleClient());
  const bytes = await files.read({ ...document,content_type: "application/pdf" });
  return { bytes,filename: `comprobante-${document.folio}.pdf` };
}
export async function getSaasDocumentProcessorStatus() {
  const client = await createSupabaseServerClient();
  const { data,error } = await client.rpc("get_saas_document_processor_status");
  if (error) throwPaymentRpcError(error);
  return parseBillingContract(z.object({
    last_worker_at: z.iso.datetime({ offset: true }).nullable(),queued: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),unknown: z.number().int().nonnegative(),
  }),data);
}
