import type { SaasPaymentEvent } from "@/domain/saas-administration/payment-event";

export interface PaymentProviderPort {
  verifyAndNormalize(input: {
    rawBody: string;
    signature: string | null;
    timestamp: string | null;
    now: Date;
  }): SaasPaymentEvent;
}

export interface SaasPaymentEventProcessorPort {
  process(event: SaasPaymentEvent): Promise<string>;
}
