import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { NotificationDeliveryRepositoryPort } from "@/application/notifications/ports/notification-delivery-repository-port";

const claimedDeliverySchema = z.object({
  id: z.uuid(),
  attemptNumber: z.number().int().positive(),
  channel: z.enum(["internal", "email", "push"]),
  recipientUserId: z.uuid(),
  eventId: z.uuid(),
  eventType: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.uuid(),
  title: z.string().min(1),
  message: z.string().min(1),
});

export class SupabaseNotificationDeliveryRepository implements NotificationDeliveryRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async claimNext(now: Date) {
    const { data, error } = await this.client.rpc(
      "claim_notification_delivery",
      { target_now: now.toISOString() },
    );
    if (error) throw error;
    if (data === null) return null;
    return claimedDeliverySchema.parse(data);
  }

  async complete(
    input: Parameters<NotificationDeliveryRepositoryPort["complete"]>[0],
  ) {
    const { data, error } = await this.client.rpc(
      "complete_notification_delivery",
      {
        target_delivery: input.deliveryId,
        target_attempt_number: input.attemptNumber,
        target_outcome: input.outcome,
        target_provider_reference: input.providerReference,
        target_error_code: input.errorCode,
        target_retryable: input.retryable,
        target_completed_at: input.completedAt.toISOString(),
      },
    );
    if (error) throw error;
    return z.enum(["pending", "delivered", "failed"]).parse(data);
  }
}
