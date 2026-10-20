import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanChangePreview } from "@/domain/saas-administration/plan-change-management";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import { CancelScheduledChangeForm, PlanChangeForm } from "./plan-change-form";

const mocks = vi.hoisted(() => ({ action: vi.fn(), cancel: vi.fn() }));
vi.mock("./actions", () => ({ planChangeAction: mocks.action, cancelPlanChangeAction: mocks.cancel }));
const plan: SaasCatalogPlan = {
  id: "plan", slug: "pro", status: "active", currentVersion: {
    id: "version", versionNumber: 1, name: "Academia Pro", description: null,
    price: 60000, currency: "CLP", durationUnit: "days", durationCount: 30, trialDays: 0,
    maxStudents: 100, maxUsers: 5, features: ["reports"], services: ["Soporte"],
    legacy: false, createdAt: "2028-01-01T00:00:00Z",
  },
};
const preview: PlanChangePreview = {
  tenantId: "tenant", planVersionId: "version", subscriptionId: "subscription", currentVersionId: "base",
  currentPlanName: "Base", planName: "Academia Pro", versionNumber: 1, fingerprint: "a".repeat(32),
  kind: "upgrade", businessDate: "2028-01-21", effectiveOn: "2028-01-21", periodStartsOn: "2028-01-01",
  periodEndExclusive: "2028-01-31", remainingDays: 10, currentRateNumerator: "30000",
  currentRateDenominator: "30", newRateNumerator: "60000", newRateDenominator: "30",
  amountDue: 10000, net: 8403, vat: 1597, price: 60000, durationUnit: "days", durationCount: 30,
  activeStudents: 10, activeUsers: 2, maxStudents: 100, maxUsers: 5, features: ["reports"], services: ["Soporte"],
};
const initial = { error: null, preview: null, result: null, stale: false };
const submit = () => act(async () => fireEvent.submit(screen.getByRole("form", { name: "Cambio contractual de plan" })));
function renderForm() { render(<PlanChangeForm tenantId="tenant" currentVersionId="base" plans={[plan]} operationId="operation" />); }
async function review() {
  mocks.action.mockResolvedValueOnce({ ...initial, preview });
  fireEvent.change(screen.getByLabelText("Nuevo plan y versión"), { target: { value: "version" } });
  await submit();
}
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
describe("commercial plan change review", () => {
  it("requires preview and shows exact charge, dates, VAT, usage and rational calculation", async () => {
    renderForm();
    expect(screen.queryByRole("button", { name: "Confirmar cambio de plan" })).toBeNull();
    await review();
    expect(screen.getByRole("heading", { name: "Upgrade inmediato" })).toBe(document.activeElement);
    expect(screen.getByText(/30000\/30.*60000\/30/)).toBeTruthy();
    expect(screen.getByText("10 / 100")).toBeTruthy();
    expect(screen.getByText(/neto.*8.403.*IVA.*1.597/)).toBeTruthy();
  });
  it("invalidates a preview on editing even when the original option is reselected", async () => {
    renderForm(); await review();
    fireEvent.change(screen.getByLabelText("Nuevo plan y versión"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Nuevo plan y versión"), { target: { value: "version" } });
    expect(screen.queryByRole("button", { name: "Confirmar cambio de plan" })).toBeNull();
  });
  it("keeps the accepted draft and operation identity for ambiguous retry", async () => {
    renderForm(); await review();
    fireEvent.change(screen.getByLabelText("Motivo del cambio"), { target: { value: "Cambio solicitado" } });
    fireEvent.click(screen.getByRole("checkbox"));
    mocks.action.mockResolvedValue({ ...initial, preview, error: "Sin conexión." });
    await submit();
    expect(screen.getByRole("alert")).toBe(document.activeElement);
    expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
    expect(screen.getByLabelText("Motivo del cambio")).toHaveProperty("value", "Cambio solicitado");
    const data = mocks.action.mock.calls[1][1] as FormData;
    await submit();
    expect((mocks.action.mock.calls[2][1] as FormData).get("operationId")).toBe(data.get("operationId"));
    expect(data.get("fingerprint")).toBe(preview.fingerprint);
    expect(data.get("accepted")).toBe("on");
  });
  it("clears stale review without losing the selected plan", async () => {
    renderForm(); await review();
    mocks.action.mockResolvedValueOnce({ ...initial, stale: true, error: "Contrato actualizado." });
    await submit();
    expect(screen.getByLabelText("Nuevo plan y versión")).toHaveProperty("value", "version");
    expect(screen.queryByRole("button", { name: "Confirmar cambio de plan" })).toBeNull();
  });
  it("reports zero charge without asserting a fictitious payment or invoice", async () => {
    renderForm(); await review();
    mocks.action.mockResolvedValueOnce({ ...initial, result: {
      ...preview, amountDue: 0, invoiceId: null, scheduledChangeId: null,
    } });
    await submit();
    expect(screen.getByRole("status").textContent).toContain("no se creó un cobro ficticio");
    expect(screen.getByRole("status").textContent).toContain("No se registró un pago");
  });
  it("cancels explicitly and disables further submissions after success", async () => {
    render(<CancelScheduledChangeForm tenantId="tenant" scheduledChangeId="change" operationId="operation" />);
    fireEvent.change(screen.getByLabelText("Motivo de cancelación"), { target: { value: "Solicitud del cliente" } });
    mocks.cancel.mockResolvedValueOnce({ error: null, saved: true });
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    expect(screen.getByRole("status").textContent).toContain("Cambio cancelado");
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);
    expect((mocks.cancel.mock.calls[0][1] as FormData).get("scheduledChangeId")).toBe("change");
  });
});
