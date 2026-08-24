import type { NotificationProviderPort } from "@/application/notifications/ports/notification-provider-port";
import { InternalNotificationProvider } from "@/infrastructure/notifications/internal-notification-provider";
import { HttpNotificationProvider } from "@/infrastructure/notifications/http-notification-provider";
import { SupabaseNotificationDeliveryRepository } from "@/infrastructure/notifications/supabase-notification-delivery-repository";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { getNotificationProviderConfig } from "@/infrastructure/supabase/env";

export function createNotificationDeliveryDeps() {
  const providers: NotificationProviderPort[] = [
    new InternalNotificationProvider(),
  ];
  for (const channel of ["email", "push"] as const) {
    const config = getNotificationProviderConfig(channel);
    if (config) {
      providers.push(
        new HttpNotificationProvider(channel, config.endpoint, config.token),
      );
    }
  }

  return {
    deliveries: new SupabaseNotificationDeliveryRepository(
      createSupabaseServiceRoleClient(),
    ),
    providers,
  };
}
