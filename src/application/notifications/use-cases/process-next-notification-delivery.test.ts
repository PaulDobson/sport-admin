import { describe, expect, it, vi } from "vitest";
import type {
  ClaimedNotificationDelivery,
  NotificationDeliveryRepositoryPort,
} from "../ports/notification-delivery-repository-port";
import {
  NotificationProviderError,
  type NotificationProviderPort,
} from "../ports/notification-provider-port";
import { processNextNotificationDelivery } from "./process-next-notification-delivery";

const delivery: ClaimedNotificationDelivery = {
  id: "delivery-1",
  attemptNumber: 1,
  channel: "email",
  recipientUserId: "user-1",
  eventId: "event-1",
  eventType: "health.authorized",
  entityType: "health_restriction",
  entityId: "restriction-1",
  title: "MEDICAL_SECRET_TITLE",
  message: "MEDICAL_SECRET_BODY",
};

function createRepository(
  completeStatus: "pending" | "delivered" | "failed" = "delivered",
) {
  return {
    claimNext: vi.fn().mockResolvedValue(delivery),
    complete: vi.fn().mockResolvedValue(completeStatus),
  } satisfies NotificationDeliveryRepositoryPort;
}

describe("processNextNotificationDelivery", () => {
  it("sends a minimized payload with a stable idempotency key", async () => {
    const deliveries = createRepository();
    const provider = {
      channel: "email",
      send: vi.fn().mockResolvedValue({ providerReference: "provider-1" }),
    } satisfies NotificationProviderPort;

    await processNextNotificationDelivery(
      { now: new Date("2026-08-23T12:00:00Z") },
      { deliveries, providers: [provider] },
    );

    expect(provider.send).toHaveBeenCalledWith({
      idempotencyKey: "delivery-1",
      recipientUserId: "user-1",
      title: "Actualización de salud autorizada",
      body: "Abre Sport Admin para revisar las indicaciones autorizadas.",
      data: {
        eventId: "event-1",
        eventType: "health.authorized",
        entityType: "health_restriction",
        entityId: "restriction-1",
      },
    });
    expect(deliveries.complete).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "delivered", errorCode: null }),
    );
  });

  it("schedules retryable failures without changing the idempotency key", async () => {
    const deliveries = createRepository("pending");
    const provider = {
      channel: "email",
      send: vi
        .fn()
        .mockRejectedValue(new NotificationProviderError("timeout", true)),
    } satisfies NotificationProviderPort;

    const result = await processNextNotificationDelivery(
      { now: new Date("2026-08-23T12:00:00Z") },
      { deliveries, providers: [provider] },
    );

    expect(result.status).toBe("retry_scheduled");
    expect(deliveries.complete).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "timeout", retryable: true }),
    );
  });

  it("fails only the external delivery when its provider is unavailable", async () => {
    const deliveries = createRepository("failed");
    deliveries.claimNext.mockResolvedValue({ ...delivery, channel: "push" });

    const result = await processNextNotificationDelivery(
      { now: new Date("2026-08-23T12:00:00Z") },
      {
        deliveries,
        providers: [
          {
            channel: "internal",
            send: vi.fn().mockResolvedValue({ providerReference: "internal" }),
          },
        ],
      },
    );

    expect(result.status).toBe("failed");
    expect(deliveries.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "provider_not_configured",
        retryable: false,
      }),
    );
  });
});
