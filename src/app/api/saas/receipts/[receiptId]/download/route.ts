import { z } from "zod";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { downloadAuthorizedSaasReceipt } from "@/infrastructure/composition/saas-documents-composition";
import { DomainError } from "@/domain/shared/errors";

export const runtime = "nodejs";
export async function GET(_request: Request,{ params }: { params: Promise<{ receiptId: string }> }) {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) return Response.json({ error: "Unauthorized" },{ status: 401 });
  const { receiptId } = await params;
  if (!z.uuid().safeParse(receiptId).success) return Response.json({ error: "Documento no disponible." },{ status: 404 });
  try {
    const { bytes,filename } = await downloadAuthorizedSaasReceipt(receiptId);
    return new Response(Buffer.from(bytes),{ headers: { "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,"Cache-Control": "private, no-store","X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof DomainError) return Response.json({ error: "Documento no disponible o aún no generado." },{ status: error.code === "UNAUTHORIZED" ? 403 : 409 });
    console.error("SaaS receipt download failed",{ code: "RECEIPT_DOWNLOAD_FAILED" });
    return Response.json({ error: "No se pudo descargar el PDF. El pago no se ha modificado." },{ status: 500 });
  }
}
