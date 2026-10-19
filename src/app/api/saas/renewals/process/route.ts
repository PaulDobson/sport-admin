import { timingSafeEqual } from "node:crypto";
import { processSaasRenewalBatch } from "@/application/saas-administration/use-cases/process-subscription-renewals";
import {
  createSaasRenewalWorkerDeps, getSaasRenewalAuthorizationSecret, getSaasRenewalConfiguration,
} from "@/infrastructure/composition/saas-renewal-composition";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supplied = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!supplied) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const expected = Buffer.from(getSaasRenewalAuthorizationSecret());
    const received = Buffer.from(supplied);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!getSaasRenewalConfiguration().enabled) {
      return Response.json({ error: "Renovaciones desactivadas. Valida PostgreSQL y el despliegue antes de habilitarlas." }, { status: 503 });
    }
    const result = await processSaasRenewalBatch({ batchSize: 10 }, createSaasRenewalWorkerDeps());
    if (result.failed > 0) console.error("SaaS renewal batch contains failed periods", { failed: result.failed, processed: result.processed });
    return Response.json(result, { status: result.failed > 0 ? 207 : 200 });
  } catch (error) {
    console.error("SaaS renewal processing failed", {
      code: typeof error === "object" && error !== null && "code" in error ? String(error.code) : "UNEXPECTED_ERROR",
    });
    return Response.json({ error: "No se completó el procesamiento de renovaciones. Revisa el registro antes de reintentar." }, { status: 500 });
  }
}
