import {
  NotificationProviderError,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationProviderPort,
} from "@/application/notifications/ports/notification-provider-port";

type ExternalChannel = Exclude<NotificationChannel, "internal">;

export class HttpNotificationProvider implements NotificationProviderPort {
  constructor(
    readonly channel: ExternalChannel,
    private readonly endpoint: string,
    private readonly token: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(message: NotificationMessage) {
    let response: Response;
    try {
      response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          "idempotency-key": message.idempotencyKey,
        },
        body: JSON.stringify({ channel: this.channel, ...message }),
      });
    } catch {
      throw new NotificationProviderError("network_error", true);
    }

    if (!response.ok) {
      throw new NotificationProviderError(
        `provider_http_${response.status}`,
        response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
      );
    }

    return {
      providerReference: response.headers.get("x-provider-reference"),
    };
  }
}
