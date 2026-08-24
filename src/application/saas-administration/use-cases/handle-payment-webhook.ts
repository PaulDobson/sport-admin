import type {
  PaymentProviderPort,
  SaasPaymentEventProcessorPort,
} from "../ports/payment-provider-port";

export async function handlePaymentWebhook(
  input: {
    rawBody: string;
    signature: string | null;
    timestamp: string | null;
    now: Date;
  },
  deps: {
    provider: PaymentProviderPort;
    events: SaasPaymentEventProcessorPort;
  },
) {
  const event = deps.provider.verifyAndNormalize(input);
  const eventId = await deps.events.process(event);
  return { eventId };
}
