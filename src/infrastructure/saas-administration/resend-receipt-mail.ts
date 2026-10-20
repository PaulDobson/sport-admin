import { z } from "zod";
import type { ReceiptMailPort } from "@/application/saas-administration/ports/receipt-processing-port";

export class ResendReceiptMail implements ReceiptMailPort {
  constructor(private readonly config: { apiKey: string; from: string } | null, private readonly request: typeof fetch = fetch) {}
  async send(input: { recipient: string; folio: number; operationId: string; bytes: Uint8Array }) {
    if (!this.config) return { status: "failed" as const,errorCode: "MAIL_NOT_CONFIGURED" };
    let response: Response;
    try {
      response = await this.request("https://api.resend.com/emails",{
        method: "POST",signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Bearer ${this.config.apiKey}`,"Content-Type": "application/json","Idempotency-Key": `saas-receipt/${input.operationId}` },
        body: JSON.stringify({ from: this.config.from,to: [input.recipient],
          subject: `Comprobante referencial ${input.folio}`,
          text: "Adjuntamos tu comprobante referencial de pago. Sin validez tributaria; no reemplaza una boleta o factura del SII.",
          attachments: [{ filename: `comprobante-${input.folio}.pdf`,content: Buffer.from(input.bytes).toString("base64") }] }),
      });
    } catch {
      return { status: "unknown" as const,errorCode: "MAIL_RESPONSE_UNKNOWN" };
    }
    if (!response.ok) return {
      status: response.status >= 500 || response.status === 409 || response.status === 408 ? "unknown" as const : "failed" as const,
      errorCode: response.status === 429 ? "MAIL_RATE_LIMITED" : response.status >= 500 ? "MAIL_PROVIDER_UNKNOWN" : "MAIL_PROVIDER_REJECTED",
    };
    const body: unknown = await response.json();
    const parsed = z.object({ id: z.string().min(1).max(200) }).safeParse(body);
    if (!parsed.success) return { status: "unknown" as const,errorCode: "MAIL_CONFIRMATION_INVALID" };
    return { status: "accepted" as const,providerId: parsed.data.id };
  }
}
