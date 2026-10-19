import { describe,expect,it,vi } from "vitest";
import { ResendReceiptMail } from "./resend-receipt-mail";
const config = { apiKey: "test-key",from: "Billing <billing@example.invalid>" };
const input = { recipient: "owner@example.invalid",folio: 42,operationId: "stable-operation",bytes: new Uint8Array([37,80,68,70]) };
describe("Resend referential attachment",() => {
  it("sends explicit recipient with stable provider idempotency and PDF attachment",async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "mail-1" }));
    expect(await new ResendReceiptMail(config,request).send(input)).toEqual({ status: "accepted",providerId: "mail-1" });
    const [url,init] = request.mock.calls[0]; expect(url).toBe("https://api.resend.com/emails");
    expect(init?.headers).toMatchObject({ "Idempotency-Key": "saas-receipt/stable-operation",Authorization: "Bearer test-key" });
    expect(JSON.parse(String(init?.body))).toMatchObject({ from: config.from,to: [input.recipient],attachments: [{ filename: "comprobante-42.pdf",content: "JVBERg==" }] });
    expect(JSON.parse(String(init?.body)).text).toContain("Sin validez tributaria");
  });
  it("never claims success or calls provider without credentials",async () => {
    const request = vi.fn<typeof fetch>(); expect(await new ResendReceiptMail(null,request).send(input)).toEqual({ status: "failed",errorCode: "MAIL_NOT_CONFIGURED" }); expect(request).not.toHaveBeenCalled();
  });
  it.each([408,409,500,503])("treats HTTP %s as unknown, not safe to resend",async (status) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("",{ status }));
    expect((await new ResendReceiptMail(config,request).send(input)).status).toBe("unknown");
  });
  it.each([400,401,422,429])("treats rejection %s as failed",async (status) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("",{ status }));
    expect((await new ResendReceiptMail(config,request).send(input)).status).toBe("failed");
  });
  it("does not silently resend after timeout",async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("timed out","TimeoutError"));
    expect((await new ResendReceiptMail(config,request).send(input)).status).toBe("unknown"); expect(request).toHaveBeenCalledOnce();
  });
  it("requires an acknowledgement identifier",async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}));
    expect((await new ResendReceiptMail(config,request).send(input)).status).toBe("unknown");
  });
});
