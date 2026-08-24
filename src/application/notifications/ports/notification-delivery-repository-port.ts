import type { NotificationChannel } from "./notification-provider-port";

export interface ClaimedNotificationDelivery {
  id: string;
  attemptNumber: number;
  channel: NotificationChannel;
  recipientUserId: string;
  eventId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
}

export interface NotificationDeliveryRepositoryPort {
  claimNext(now: Date): Promise<ClaimedNotificationDelivery | null>;
  complete(input: {
    deliveryId: string;
    attemptNumber: number;
    outcome: "delivered" | "failed";
    providerReference: string | null;
    errorCode: string | null;
    retryable: boolean;
    completedAt: Date;
  }): Promise<"pending" | "delivered" | "failed">;
}
