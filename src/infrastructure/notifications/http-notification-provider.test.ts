import { describe, expect, it, vi } from "vitest";
import { NotificationProviderError } from "@/application/notifications/ports/notification-provider-port";
import { HttpNotificationProvider } from "./http-notification-provider";

const message = {
  idempotencyKey: "delivery-1",
  recipientUserId: "user-1",
  title: "Title",
  body: "Body",
  data: {
    eventId: "event-1",
    eventType: "attendance.absent",
    entityType: "attendance",
    entityId: "attendance-1",
  },
};

describe("HttpNotificationProvider", () => {
  it("sends the stable delivery id as provider idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 202,
        headers: { "x-provider-reference": "provider-1" },
      }),
    );
    const provider = new HttpNotificationProvider(
      "email",
      "https://provider.example/deliver",
      "secret",
      fetcher,
    );

    await expect(provider.send(message)).resolves.toEqual({
      providerReference: "provider-1",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://provider.example/deliver",
      expect.objectContaining({
        headers: expect.objectContaining({
          "idempotency-key": "delivery-1",
        }),
      }),
    );
  });

  it.each([
    [429, true],
    [503, true],
    [400, false],
  ])("classifies HTTP %s retryability", async (status, retryable) => {
    const provider = new HttpNotificationProvider(
      "push",
      "https://provider.example/deliver",
      "secret",
      vi.fn().mockResolvedValue(new Response(null, { status })),
    );

    try {
      await provider.send(message);
      throw new Error("Expected provider failure");
    } catch (error) {
      expect(error).toBeInstanceOf(NotificationProviderError);
      expect((error as NotificationProviderError).retryable).toBe(retryable);
    }
  });
});
