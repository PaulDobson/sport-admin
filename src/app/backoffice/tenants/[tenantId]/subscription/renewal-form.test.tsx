import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenewalForm } from "./renewal-form";
const mocks = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock("./renewal-action", () => ({ renewalAction: mocks.action }));
function renderForm(enabled = true, scheduledPrice: number | null = null) {
  render(<RenewalForm subscriptionId="subscription" tenantId="tenant" expectedPeriodEnd="2028-02-29" requestId="request"
    price={11900} enabled={enabled} scheduledPrice={scheduledPrice} />);
}
const submit = () => act(async () => fireEvent.submit(screen.getByRole("form")));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
describe("manual renewal UX", () => {
  it("does not offer a write when processing is disabled", () => {
    renderForm(false);
    expect(screen.getByRole("status").textContent).toContain("desactivadas");
    expect(screen.queryByRole("form")).toBeNull();
  });
  it("shows both possible prices when usage must be revalidated", () => {
    renderForm(true, 5000);
    expect(screen.getByText(/Si cumple.*5.000.*si excede.*11.900/)).toBeTruthy();
  });
  it("preserves request identity and acceptance on ambiguous failure", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("checkbox"));
    mocks.action.mockResolvedValue({ error: "Timeout: revisa el contrato", result: null });
    await submit();
    expect(screen.getByRole("alert")).toBe(document.activeElement);
    expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
    const first = mocks.action.mock.calls[0][1] as FormData;
    await submit();
    expect((mocks.action.mock.calls[1][1] as FormData).get("requestId")).toBe(first.get("requestId"));
    expect(first.get("expectedPeriodEnd")).toBe("2028-02-29");
  });
  it("allows an explicit new request after reconciliation rather than replaying a cached failure forever", async () => {
    renderForm();
    mocks.action.mockResolvedValue({ error: "Conciliar", result: null });
    await submit();
    const first = mocks.action.mock.calls[0][1] as FormData;
    fireEvent.click(screen.getByRole("button", { name: "Revisé el contrato: iniciar nuevo intento" }));
    expect(screen.getByRole("checkbox")).toHaveProperty("checked", false);
    await submit();
    expect((mocks.action.mock.calls[1][1] as FormData).get("requestId")).not.toBe(first.get("requestId"));
  });
  it("shows the committed result and blocked downgrade without asserting a payment", async () => {
    renderForm();
    mocks.action.mockResolvedValue({ error: null, result: {
      status: "renewed", periodStartsOn: "2028-02-29", periodEndExclusive: "2028-03-31",
      invoiceId: "invoice", amount: 11900, blockedReason: "Uso excedido: se renovó el plan anterior.",
    } });
    await submit();
    expect(screen.getByRole("status").textContent).toContain("No se registró un pago");
    expect(screen.getByRole("alert").textContent).toContain("Uso excedido");
    expect(screen.queryByRole("form")).toBeNull();
  });
});
