import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssignmentPreview } from "@/domain/saas-administration/subscription-management";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import { AssignmentForm } from "./assignment-form";

const mocks = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock("./actions", () => ({ assignmentAction: mocks.action }));
const plan: SaasCatalogPlan = {
  id: "plan",
  slug: "pro",
  status: "active",
  currentVersion: {
    id: "version",
    versionNumber: 1,
    name: "Academia Pro",
    description: null,
    price: 11900,
    currency: "CLP",
    durationUnit: "months",
    durationCount: 1,
    trialDays: 7,
    maxStudents: 100,
    maxUsers: 5,
    features: ["reports"],
    services: ["Capacitación"],
    legacy: false,
    createdAt: "2028-01-01T00:00:00Z",
  },
};
const preview: AssignmentPreview = {
  tenantId: "tenant",
  tenantName: "Academia",
  tenantStatus: "active",
  planId: "plan",
  planVersionId: "version",
  planName: "Academia Pro",
  versionNumber: 1,
  businessDate: "2028-01-31",
  startsOn: "2028-01-31",
  useTrial: false,
  dueOn: "",
  fingerprint: "a".repeat(32),
  trialEndExclusive: null,
  firstPaidPeriod: { startsOn: "2028-01-31", endsBefore: "2028-02-29" },
  resolvedDueOn: "2028-01-31",
  price: 11900,
  initialAmount: 11900,
  createsInvoice: true,
  net: 10000,
  vat: 1900,
  durationUnit: "months",
  durationCount: 1,
  activeStudents: 10,
  activeUsers: 2,
  maxStudents: 100,
  maxUsers: 5,
  features: ["reports"],
  services: ["Capacitación"],
};
const initial = {
  error: null,
  fieldErrors: {},
  preview: null,
  result: null,
  stale: false,
};
const submit = () =>
  act(async () =>
    fireEvent.submit(screen.getByRole("form", { name: "Asignación de plan" })),
  );
function renderForm(plans = [plan]) {
  render(
    <AssignmentForm
      tenantId="tenant"
      tenantName="Academia"
      plans={plans}
      businessDate="2028-01-31"
      operationId="operation"
    />,
  );
}
async function getPreview() {
  mocks.action.mockResolvedValueOnce({ ...initial, preview });
  fireEvent.change(screen.getByLabelText("Plan y versión"), {
    target: { value: "version" },
  });
  await submit();
}
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("assignment review and confirmation UX", () => {
  it("does not offer confirmation until an authoritative preview has been obtained", async () => {
    renderForm();
    expect(
      screen.queryByRole("button", { name: "Confirmar asignación" }),
    ).toBeNull();
    await getPreview();
    expect(screen.getByRole("heading", { name: "Revisar asignación" })).toBe(
      document.activeElement,
    );
    expect(screen.getByText(/neto.*10.000.*IVA.*1.900/)).toBeTruthy();
    expect(screen.getByText("10 / 100")).toBeTruthy();
    expect(screen.getByText("Capacitación")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Confirmar asignación" }),
    ).toBeTruthy();
    const data = mocks.action.mock.calls[0][1] as FormData;
    expect(data.get("intent")).toBe("preview");
    expect(data.get("fingerprint")).toBe("");
  });
  it("invalidates a reviewed preview when monetary inputs change, even if values are reverted", async () => {
    renderForm();
    await getPreview();
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), {
      target: { value: "2028-02-01" },
    });
    expect(
      screen.queryByRole("button", { name: "Confirmar asignación" }),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), {
      target: { value: "2028-01-31" },
    });
    expect(
      screen.queryByRole("button", { name: "Confirmar asignación" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Previsualizar asignación" }),
    ).toBeTruthy();
  });
  it("retains data on conflicts, requires fresh preview, and never reports a recorded payment", async () => {
    renderForm();
    await getPreview();
    fireEvent.change(screen.getByLabelText("Motivo de asignación"), {
      target: { value: "Contrato inicial" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Revisé el plan/ }));
    mocks.action.mockResolvedValueOnce({
      ...initial,
      error: "El uso cambió. Revisa nuevamente.",
      stale: true,
    });
    await submit();
    expect(screen.getByRole("alert")).toBe(document.activeElement);
    expect(screen.getByLabelText(/Fecha de inicio/)).toHaveProperty(
      "value",
      "2028-01-31",
    );
    expect(screen.getByLabelText("Plan y versión")).toHaveProperty(
      "value",
      "version",
    );
    expect(screen.queryByText("Plan asignado")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Previsualizar asignación" }),
    ).toBeTruthy();
    const data = mocks.action.mock.calls[1][1] as FormData;
    expect(data.get("intent")).toBe("confirm");
    expect(data.get("fingerprint")).toBe(preview.fingerprint);
    expect(data.get("reason")).toBe("Contrato inicial");
    expect(data.get("accepted")).toBe("on");
  });
  it("keeps the operation identity and accepted draft across an ambiguous retry", async () => {
    renderForm();
    await getPreview();
    fireEvent.change(screen.getByLabelText("Motivo de asignación"), {
      target: { value: "Contrato inicial" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Revisé el plan/ }));
    const failure = {
      ...initial,
      preview,
      error: "Sin conexión; vuelve a intentar.",
    };
    mocks.action.mockResolvedValue(failure);
    await submit();
    expect(screen.getByLabelText("Motivo de asignación")).toHaveProperty(
      "value",
      "Contrato inicial",
    );
    expect(
      screen.getByRole("checkbox", { name: /Revisé el plan/ }),
    ).toHaveProperty("checked", true);
    const operation = (mocks.action.mock.calls[1][1] as FormData).get(
      "operationId",
    );
    await submit();
    expect((mocks.action.mock.calls[2][1] as FormData).get("operationId")).toBe(
      operation,
    );
  });
  it("locks inputs while pending and replaces the form with the actual confirmation result", async () => {
    renderForm();
    await getPreview();
    let finish!: (value: unknown) => void;
    mocks.action.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("form").getAttribute("aria-busy")).toBe("true"),
    );
    expect(
      screen.getByRole("button", { name: "Confirmar asignación" }),
    ).toHaveProperty("disabled", true);
    await act(async () =>
      finish({
        ...initial,
        result: {
          tenantId: "tenant",
          subscriptionId: "subscription",
          planVersionId: "version",
          invoiceId: "invoice",
          status: "active",
          initialAmount: 11900,
          periodEndExclusive: "2028-02-29",
        },
      }),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "No se registró ningún pago",
    );
    expect(screen.queryByRole("form")).toBeNull();
  });
  it("provides an actionable empty state without a fake default plan", () => {
    renderForm([]);
    expect(screen.getByRole("status").textContent).toContain(
      "No hay planes activos",
    );
    expect(
      screen
        .getByRole("link", { name: "Crea o publica un plan" })
        .getAttribute("href"),
    ).toBe("/backoffice/plans?new=1");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
