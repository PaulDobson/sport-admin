import { GenericHmacPaymentProvider } from "@/infrastructure/payments/generic-hmac-payment-provider";
import { SupabaseSaasPaymentEventProcessor } from "@/infrastructure/payments/supabase-saas-payment-event-processor";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { getSaasWebhookSecret } from "@/infrastructure/supabase/env";

export function createSaasPaymentWebhookDeps() {
  return {
    provider: new GenericHmacPaymentProvider(getSaasWebhookSecret()),
    events: new SupabaseSaasPaymentEventProcessor(
      createSupabaseServiceRoleClient(),
    ),
  };
}
