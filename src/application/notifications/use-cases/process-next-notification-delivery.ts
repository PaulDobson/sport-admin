import type { NotificationDeliveryRepositoryPort } from "../ports/notification-delivery-repository-port";
import {
  NotificationProviderError,
  type NotificationProviderPort,
} from "../ports/notification-provider-port";

export async function processNextNotificationDelivery(
  input: { now: Date },
  deps: {
    deliveries: NotificationDeliveryRepositoryPort;
    providers: readonly NotificationProviderPort[];
  },
) {
  const delivery = await deps.deliveries.claimNext(input.now);
  if (!delivery) return { status: "idle" as const };

  const provider = deps.providers.find(
    (candidate) => candidate.channel === delivery.channel,
  );
  if (!provider) {
    await deps.deliveries.complete({
      deliveryId: delivery.id,
      attemptNumber: delivery.attemptNumber,
      outcome: "failed",
      providerReference: null,
      errorCode: "provider_not_configured",
      retryable: false,
      completedAt: input.now,
    });
    return { status: "failed" as const, deliveryId: delivery.id };
  }

  try {
    const content = delivery.eventType.startsWith("health.")
      ? {
          title: "Actualización de salud autorizada",
          body: "Abre Sport Admin para revisar las indicaciones autorizadas.",
        }
      : { title: delivery.title, body: delivery.message };
    const result = await provider.send({
      idempotencyKey: delivery.id,
      recipientUserId: delivery.recipientUserId,
      title: content.title,
      body: content.body,
      data: {
        eventId: delivery.eventId,
        eventType: delivery.eventType,
        entityType: delivery.entityType,
        entityId: delivery.entityId,
      },
    });
    await deps.deliveries.complete({
      deliveryId: delivery.id,
      attemptNumber: delivery.attemptNumber,
      outcome: "delivered",
      providerReference: result.providerReference,
      errorCode: null,
      retryable: false,
      completedAt: input.now,
    });
    return { status: "delivered" as const, deliveryId: delivery.id };
  } catch (error) {
    const providerError =
      error instanceof NotificationProviderError
        ? error
        : new NotificationProviderError("provider_error", true);
    const status = await deps.deliveries.complete({
      deliveryId: delivery.id,
      attemptNumber: delivery.attemptNumber,
      outcome: "failed",
      providerReference: null,
      errorCode: providerError.code,
      retryable: providerError.retryable,
      completedAt: input.now,
    });
    return {
      status:
        status === "pending"
          ? ("retry_scheduled" as const)
          : ("failed" as const),
      deliveryId: delivery.id,
    };
  }
}
