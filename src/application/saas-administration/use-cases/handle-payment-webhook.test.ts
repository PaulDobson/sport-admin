import { describe, expect, it, vi } from "vitest";
import type { SaasPaymentEvent } from "@/domain/saas-administration/payment-event";
import { handlePaymentWebhook } from "./handle-payment-webhook";

describe("handlePaymentWebhook", () => {
  it("normalizes and processes an event once through its ports", async () => {
    const event: SaasPaymentEvent = {
      provider: "generic",
      externalEventId: "event-1",
      type: "charge.failed",
      externalSubscriptionId: "subscription-1",
      externalInvoiceId: "invoice-1",
      externalChargeId: "charge-1",
      externalRefundId: null,
      amount: "49.00",
      currency: "USD",
      occurredAt: new Date("2026-08-22T10:00:00Z"),
      reason: "Card declined",
    };
    const verifyAndNormalize = vi.fn(() => event);
    const process = vi.fn(async () => "event-row-1");

    await expect(
      handlePaymentWebhook(
        {
          rawBody: "{}",
          signature: "signature",
          timestamp: "1",
          now: new Date(),
        },
        { provider: { verifyAndNormalize }, events: { process } },
      ),
    ).resolves.toEqual({ eventId: "event-row-1" });
    expect(process).toHaveBeenCalledOnce();
    expect(process).toHaveBeenCalledWith(event);
  });
});
