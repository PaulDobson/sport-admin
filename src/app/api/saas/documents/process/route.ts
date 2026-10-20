import { timingSafeEqual } from "node:crypto";
import { processReceiptJobs } from "@/application/saas-administration/use-cases/process-receipt-jobs";
import { createSaasDocumentWorkerDeps,getSaasDocumentAuthorizationSecret,getSaasDocumentConfiguration } from "@/infrastructure/composition/saas-documents-composition";

export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(request: Request) {
  const supplied = /^Bearer (.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!supplied) return Response.json({ error: "Unauthorized" },{ status: 401 });
  try {
    const expected = Buffer.from(getSaasDocumentAuthorizationSecret());
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !timingSafeEqual(expected,actual)) return Response.json({ error: "Unauthorized" },{ status: 401 });
    if (!getSaasDocumentConfiguration().enabled) return Response.json({ error: "Procesador de documentos desactivado." },{ status: 503 });
    const result = await processReceiptJobs(createSaasDocumentWorkerDeps());
    return Response.json(result,{ status: result.failed || result.unknown ? 207 : 200 });
  } catch {
    console.error("SaaS document worker failed",{ code: "DOCUMENT_WORKER_FAILED" });
    return Response.json({ error: "No se completó el procesamiento. Revisa las tareas y sus leases antes de reintentar." },{ status: 500 });
  }
}
