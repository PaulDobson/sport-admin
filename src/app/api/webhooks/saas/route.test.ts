import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { handlePaymentWebhook } from "@/application/saas-administration/use-cases/handle-payment-webhook";

vi.mock(
  "@/application/saas-administration/use-cases/handle-payment-webhook",
  () => ({ handlePaymentWebhook: vi.fn() }),
);
vi.mock(
  "@/infrastructure/composition/saas-payment-webhook-composition",
  () => ({
    createSaasPaymentWebhookDeps: () => ({}),
  }),
);

const sensitivePayload = JSON.stringify({
  tenantId: "c84d5db9-bc46-4f45-aa31-d16e77327c01",
  medicalNote: "Dolor de rodilla",
});

function request() {
  return new Request("http://localhost/api/webhooks/saas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: sensitivePayload,
  });
}

describe("POST /api/webhooks/saas observability", () => {
  beforeEach(() => {
    vi.mocked(handlePaymentWebhook).mockReset();
  });

  it("records successful processing latency without webhook content", async () => {
    vi.mocked(handlePaymentWebhook).mockResolvedValue({
      eventId: "event-row-1",
    });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    const serialized = String(info.mock.calls[0][0]);
    expect(JSON.parse(serialized)).toMatchObject({
      area: "saas_webhook",
      operation: "process",
      outcome: "success",
    });
    expect(serialized).not.toContain("c84d5db9");
    expect(serialized).not.toContain("Dolor");
  });

  it("records unexpected failures without exception details", async () => {
    vi.mocked(handlePaymentWebhook).mockRejectedValue(
      new Error("Student c84d5db9 has a medical condition"),
    );
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(request());

    expect(response.status).toBe(500);
    const serialized = String(error.mock.calls[0][0]);
    expect(JSON.parse(serialized)).toMatchObject({
      area: "saas_webhook",
      operation: "process",
      outcome: "failure",
      errorCode: "UNEXPECTED_ERROR",
    });
    expect(serialized).not.toContain("Student");
    expect(serialized).not.toContain("medical");
  });
});
