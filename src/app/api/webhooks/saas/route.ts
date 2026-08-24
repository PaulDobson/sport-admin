import {
  DomainError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/shared/errors";
import { handlePaymentWebhook } from "@/application/saas-administration/use-cases/handle-payment-webhook";
import { createObservability } from "@/infrastructure/composition/observability-composition";
import { createSaasPaymentWebhookDeps } from "@/infrastructure/composition/saas-payment-webhook-composition";

export const runtime = "nodejs";

const maximumBodyBytes = 64 * 1024;

export async function POST(request: Request) {
  const startedAt = performance.now();
  const observability = createObservability();
  const record = (
    outcome: "success" | "rejected" | "failure",
    errorCode?: string,
  ) =>
    observability.record({
      area: "saas_webhook",
      operation: "process",
      outcome,
      durationMs: performance.now() - startedAt,
      errorCode,
    });
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    record("rejected", "PAYLOAD_TOO_LARGE");
    return Response.json(
      { error: "Webhook payload is too large" },
      { status: 413 },
    );
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maximumBodyBytes) {
    record("rejected", "PAYLOAD_TOO_LARGE");
    return Response.json(
      { error: "Webhook payload is too large" },
      { status: 413 },
    );
  }

  try {
    const result = await handlePaymentWebhook(
      {
        rawBody,
        signature: request.headers.get("x-saas-signature"),
        timestamp: request.headers.get("x-saas-timestamp"),
        now: new Date(),
      },
      createSaasPaymentWebhookDeps(),
    );
    record("success");
    return Response.json({ received: true, eventId: result.eventId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      record("rejected", "UNAUTHORIZED");
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ValidationError) {
      record("rejected", "INVALID_PAYLOAD");
      return Response.json(
        { error: error.message, issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof DomainError) {
      record("rejected", "DOMAIN_REJECTION");
      return Response.json({ error: error.message }, { status: 422 });
    }
    record("failure", "UNEXPECTED_ERROR");
    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
