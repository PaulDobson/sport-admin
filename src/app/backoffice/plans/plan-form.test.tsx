import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import { ArchivePlanForm, PlanForm } from "./plan-form";

const mocks = vi.hoisted(() => ({ publish: vi.fn(), archive: vi.fn() }));
vi.mock("./actions", () => ({ publishPlanAction: mocks.publish, archivePlanAction: mocks.archive }));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
const plan: SaasCatalogPlan = {
  id: "plan", slug: "academia", status: "active",
  currentVersion: {
    id: "version", versionNumber: 1, name: "Academia", description: "Soporte incluido",
    price: 11900, currency: "CLP", durationUnit: "months", durationCount: 1,
    trialDays: 7, maxStudents: 100, maxUsers: 5, features: ["reports"],
    services: ["Capacitación"], legacy: false, createdAt: "2026-01-01T00:00:00Z",
  },
};

describe("mobile-first SaaS plan editor", () => {
  it("reuses accessible controls and shows exact included VAT without adding it", () => {
    render(<PlanForm plan={plan} operationId="operation" />);
    expect(screen.getByText(/neto.*10.000.*IVA.*1.900/)).toBeTruthy();
    expect(screen.getByText(/no cambia los contratos vigentes/)).toBeTruthy();
    expect(screen.getByLabelText("Nombre del plan")).toHaveProperty("value", "Academia");
    expect(screen.getByRole("checkbox", { name: /Reportes/ })).toHaveProperty("checked", true);
    expect(screen.getByLabelText(/Servicios incluidos/)).toHaveProperty("value", "Capacitación");
    for (const label of ["Nombre del plan", "Precio final en CLP", "Duración", "Máximo de alumnos", "Máximo de usuarios"]) {
      expect(screen.getByLabelText(label).className).toContain("h-11");
    }
  });
  it("updates tax preview without accepting fractional pesos or inventing a total for empty input", () => {
    render(<PlanForm operationId="operation" />);
    const price = screen.getByLabelText("Precio final en CLP");
    expect(screen.queryByText(/IVA 19% incluido:/)).toBeNull();
    fireEvent.change(price, { target: { value: "11900" } });
    expect(screen.getByText(/neto.*10.000.*IVA.*1.900/)).toBeTruthy();
    fireEvent.change(price, { target: { value: "11900.5" } });
    expect(screen.queryByText(/IVA 19% incluido:/)).toBeNull();
    fireEvent.change(price, { target: { value: "" } });
    expect(screen.queryByText(/IVA 19% incluido:/)).toBeNull();
  });
  it("does not silently convert legacy USD into CLP when publishing a version", () => {
    render(<PlanForm plan={{ ...plan, currentVersion: { ...plan.currentVersion, currency: "USD", price: 19.99, legacy: true } }} operationId="operation" />);
    expect(screen.getByLabelText("Precio final en CLP")).toHaveProperty("value", "");
    expect(screen.getByRole("note").textContent).toContain("no se realizará una conversión");
  });
  it("requires a reason and explicit confirmation before archiving", () => {
    render(<ArchivePlanForm plan={plan} operationId="operation" />);
    expect(screen.getByLabelText("Motivo de archivo")).toHaveProperty("required", true);
    expect(screen.getByRole("button", { name: "Confirmar archivo" })).toBeTruthy();
    expect(screen.getByText(/No cancela ni cambia suscripciones/)).toBeTruthy();
  });
  it("retains every draft field after a failed action and focuses the invalid field", async () => {
    mocks.publish.mockResolvedValue({ saved: false, error: "Revisa los límites.", fieldErrors: { "terms.maxStudents": "Límite inválido." } });
    render(<PlanForm plan={plan} operationId="operation" />);
    fireEvent.change(screen.getByLabelText("Nombre del plan"), { target: { value: "Oferta corregida" } });
    fireEvent.change(screen.getByLabelText("Descripción (opcional)"), { target: { value: "No perder descripción" } });
    fireEvent.change(screen.getByLabelText(/Servicios incluidos/), { target: { value: "Nuevo servicio" } });
    fireEvent.change(screen.getByLabelText("Motivo de publicación"), { target: { value: "Corrección" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Tiempo real/ }));
    expect(screen.getByRole("checkbox", { name: /Tiempo real/ })).toHaveProperty("checked", true);
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Condiciones del plan" })));
    expect(screen.getByLabelText("Nombre del plan")).toHaveProperty("value", "Oferta corregida");
    expect(screen.getByLabelText("Descripción (opcional)")).toHaveProperty("value", "No perder descripción");
    expect(screen.getByLabelText(/Servicios incluidos/)).toHaveProperty("value", "Nuevo servicio");
    expect(screen.getByLabelText("Motivo de publicación")).toHaveProperty("value", "Corrección");
    expect(screen.getByRole("checkbox", { name: /Tiempo real/ })).toHaveProperty("checked", true);
    expect(document.activeElement).toBe(screen.getByLabelText("Máximo de alumnos"));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("blocks repeated submit while pending and removes stale success when editing", async () => {
    let finish!: (value: { saved: boolean; error: null; fieldErrors: Record<string, string> }) => void;
    mocks.publish.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<PlanForm plan={plan} operationId="operation" />);
    fireEvent.submit(screen.getByRole("form", { name: "Condiciones del plan" }));
    await waitFor(() => expect(screen.getByRole("form").getAttribute("aria-busy")).toBe("true"));
    expect(screen.getByRole("button", { name: /Publicar nueva versión/ })).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Nombre del plan").closest("fieldset")).toHaveProperty("disabled", true);
    await act(async () => finish({ saved: true, error: null, fieldErrors: {} }));
    expect(screen.getByRole("status").textContent).toContain("Versión publicada");
    expect(screen.getByRole("button", { name: /Publicar nueva versión/ })).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Nombre del plan"), { target: { value: "Otra oferta" } });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: /Publicar nueva versión/ })).toHaveProperty("disabled", false);
  });
});
