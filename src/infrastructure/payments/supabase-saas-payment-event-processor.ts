import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaasPaymentEvent } from "@/domain/saas-administration/payment-event";
import type { SaasPaymentEventProcessorPort } from "@/application/saas-administration/ports/payment-provider-port";

export class SupabaseSaasPaymentEventProcessor implements SaasPaymentEventProcessorPort {
  constructor(private readonly client: SupabaseClient) {}

  async process(event: SaasPaymentEvent): Promise<string> {
    const { data, error } = await this.client.rpc(
      "process_saas_payment_event",
      {
        target_provider: event.provider,
        target_external_event_id: event.externalEventId,
        target_event_type: event.type,
        target_external_subscription_id: event.externalSubscriptionId,
        target_external_invoice_id: event.externalInvoiceId,
        target_external_charge_id: event.externalChargeId,
        target_external_refund_id: event.externalRefundId,
        target_amount: event.amount,
        target_currency: event.currency,
        target_occurred_at: event.occurredAt.toISOString(),
        target_reason: event.reason,
      },
    );
    if (error) throw error;
    if (typeof data !== "string")
      throw new Error("Payment event did not return an id");
    return data;
  }
}
