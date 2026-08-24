import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { UnauthorizedError, ValidationError } from "@/domain/shared/errors";
import type { SaasPaymentEvent } from "@/domain/saas-administration/payment-event";
import type { PaymentProviderPort } from "@/application/saas-administration/ports/payment-provider-port";

const payloadSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "charge.succeeded",
    "charge.failed",
    "refund.succeeded",
    "refund.failed",
  ]),
  subscriptionId: z.string().min(1),
  invoiceId: z.string().min(1).nullable().optional(),
  chargeId: z.string().min(1),
  refundId: z.string().min(1).nullable().optional(),
  amount: z.string().regex(/^(?:0|[1-9]\d{0,9})\.\d{2}$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  occurredAt: z.iso.datetime({ offset: true }),
  reason: z.string().max(500).nullable().optional(),
});

export class GenericHmacPaymentProvider implements PaymentProviderPort {
  readonly provider = "generic";

  constructor(
    private readonly secret: string,
    private readonly toleranceSeconds = 300,
  ) {}

  verifyAndNormalize(input: {
    rawBody: string;
    signature: string | null;
    timestamp: string | null;
    now: Date;
  }): SaasPaymentEvent {
    const timestampSeconds = Number(input.timestamp);
    if (!input.signature || !Number.isInteger(timestampSeconds)) {
      throw new UnauthorizedError("Invalid webhook signature");
    }
    if (
      Math.abs(input.now.getTime() / 1000 - timestampSeconds) >
      this.toleranceSeconds
    ) {
      throw new UnauthorizedError(
        "Webhook timestamp is outside the allowed window",
      );
    }

    const suppliedHex = input.signature.replace(/^sha256=/, "");
    const expected = createHmac("sha256", this.secret)
      .update(`${input.timestamp}.${input.rawBody}`)
      .digest();
    let supplied: Buffer;
    try {
      supplied = Buffer.from(suppliedHex, "hex");
    } catch {
      throw new UnauthorizedError("Invalid webhook signature");
    }
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedError("Invalid webhook signature");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input.rawBody);
    } catch {
      throw new ValidationError([
        { path: "body", message: "Webhook body must be valid JSON" },
      ]);
    }
    const result = payloadSchema.safeParse(parsed);
    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
    const payload = result.data;
    if (payload.amount === "0.00") {
      throw new ValidationError([
        { path: "amount", message: "Amount must be positive" },
      ]);
    }
    if (payload.type.startsWith("charge.") && !payload.invoiceId) {
      throw new ValidationError([
        { path: "invoiceId", message: "Charge events require invoiceId" },
      ]);
    }
    if (payload.type.startsWith("refund.") && !payload.refundId) {
      throw new ValidationError([
        { path: "refundId", message: "Refund events require refundId" },
      ]);
    }

    return {
      provider: this.provider,
      externalEventId: payload.id,
      type: payload.type,
      externalSubscriptionId: payload.subscriptionId,
      externalInvoiceId: payload.invoiceId ?? null,
      externalChargeId: payload.chargeId,
      externalRefundId: payload.refundId ?? null,
      amount: payload.amount,
      currency: payload.currency,
      occurredAt: new Date(payload.occurredAt),
      reason: payload.reason ?? null,
    };
  }
}
