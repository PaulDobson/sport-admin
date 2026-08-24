import type {
  NotificationMessage,
  NotificationProviderPort,
} from "@/application/notifications/ports/notification-provider-port";

export class InternalNotificationProvider implements NotificationProviderPort {
  readonly channel = "internal" as const;

  async send(message: NotificationMessage) {
    return { providerReference: `internal:${message.idempotencyKey}` };
  }
}
