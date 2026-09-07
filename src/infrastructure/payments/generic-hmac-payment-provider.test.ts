import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { UnauthorizedError, ValidationError } from "@/domain/shared/errors";
import { GenericHmacPaymentProvider } from "./generic-hmac-payment-provider";

const secret = "test-webhook-secret";
const timestamp = "1787392800";
const now = new Date(Number(timestamp) * 1000);

function sign(body: string) {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

describe("GenericHmacPaymentProvider", () => {
  it("verifies and normalizes a signed charge event", () => {
    const body = JSON.stringify({
      id: "event-1",
      type: "charge.succeeded",
      subscriptionId: "subscription-1",
      invoiceId: "invoice-1",
      chargeId: "charge-1",
      amount: "49.00",
      currency: "USD",
      occurredAt: "2026-08-22T10:00:00Z",
    });

    const event = new GenericHmacPaymentProvider(secret).verifyAndNormalize({
      rawBody: body,
      signature: sign(body),
      timestamp,
      now,
    });

    expect(event).toEqual(
      expect.objectContaining({
        provider: "generic",
        externalEventId: "event-1",
        type: "charge.succeeded",
        externalInvoiceId: "invoice-1",
      }),
    );
  });

  it("accepts CLP using the provider's two-decimal transport format", () => {
    const body = JSON.stringify({
      id: "event-clp",
      type: "charge.succeeded",
      subscriptionId: "subscription-1",
      invoiceId: "invoice-1",
      chargeId: "charge-clp",
      amount: "30000.00",
      currency: "CLP",
      occurredAt: "2026-08-22T10:00:00Z",
    });

    const event = new GenericHmacPaymentProvider(secret).verifyAndNormalize({
      rawBody: body,
      signature: sign(body),
      timestamp,
      now,
    });

    expect(event).toEqual(
      expect.objectContaining({
        amount: "30000.00",
        currency: "CLP",
      }),
    );
  });

  it("rejects integer transport amounts and lowercase currencies", () => {
    for (const [amount, currency] of [
      ["30000", "CLP"],
      ["30000.00", "clp"],
    ]) {
      const body = JSON.stringify({
        id: `event-invalid-${amount}-${currency}`,
        type: "charge.succeeded",
        subscriptionId: "subscription-1",
        invoiceId: "invoice-1",
        chargeId: "charge-invalid",
        amount,
        currency,
        occurredAt: "2026-08-22T10:00:00Z",
      });

      expect(() =>
        new GenericHmacPaymentProvider(secret).verifyAndNormalize({
          rawBody: body,
          signature: sign(body),
          timestamp,
          now,
        }),
      ).toThrow(ValidationError);
    }
  });

  it("rejects invalid signatures and stale timestamps", () => {
    const provider = new GenericHmacPaymentProvider(secret);
    expect(() =>
      provider.verifyAndNormalize({
        rawBody: "{}",
        signature: "sha256=00",
        timestamp,
        now,
      }),
    ).toThrow(UnauthorizedError);
    expect(() =>
      provider.verifyAndNormalize({
        rawBody: "{}",
        signature: sign("{}"),
        timestamp,
        now: new Date(now.getTime() + 301_000),
      }),
    ).toThrow(UnauthorizedError);
  });

  it("requires event-specific identifiers", () => {
    const body = JSON.stringify({
      id: "event-2",
      type: "refund.succeeded",
      subscriptionId: "subscription-1",
      chargeId: "charge-1",
      amount: "10.00",
      currency: "USD",
      occurredAt: "2026-08-22T10:00:00Z",
    });
    expect(() =>
      new GenericHmacPaymentProvider(secret).verifyAndNormalize({
        rawBody: body,
        signature: sign(body),
        timestamp,
        now,
      }),
    ).toThrow(ValidationError);
  });
});
