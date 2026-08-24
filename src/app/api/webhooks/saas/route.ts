import {
  DomainError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/shared/errors";
import { handlePaymentWebhook } from "@/application/saas-administration/use-cases/handle-payment-webhook";
import { createSaasPaymentWebhookDeps } from "@/infrastructure/composition/saas-payment-webhook-composition";

export const runtime = "nodejs";

const maximumBodyBytes = 64 * 1024;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    return Response.json(
      { error: "Webhook payload is too large" },
      { status: 413 },
    );
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maximumBodyBytes) {
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
    return Response.json({ received: true, eventId: result.eventId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ValidationError) {
      return Response.json(
        { error: error.message, issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("SaaS payment webhook failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined,
    });
    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
