export type NotificationChannel = "internal" | "email" | "push";

export interface NotificationMessage {
  idempotencyKey: string;
  recipientUserId: string;
  title: string;
  body: string;
  data: {
    eventId: string;
    eventType: string;
    entityType: string;
    entityId: string;
  };
}

export interface NotificationProviderResult {
  providerReference: string | null;
}

export interface NotificationProviderPort {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<NotificationProviderResult>;
}

export class NotificationProviderError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "NotificationProviderError";
  }
}
