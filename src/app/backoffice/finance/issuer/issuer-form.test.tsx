import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingIssuer } from "@/domain/saas-administration/billing-issuer";
import { IssuerForm } from "./issuer-form";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./actions", () => ({ saveIssuerAction: mocks.save }));
const issuer: BillingIssuer = { id: "old-version", versionNumber: 1, legalName: "Plataforma",
  taxId: "12345678-5", address: "Calle 1", email: "issuer@example.invalid", createdAt: "2026-01-01T00:00:00Z" };
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
describe("issuer form", () => {
  it("provides required labeled shared controls", () => {
    render(<IssuerForm issuer={issuer} operationId="operation" />);
    expect(screen.getByLabelText("Razón social del emisor")).toHaveProperty("value", "Plataforma");
    for (const label of ["Razón social del emisor", "RUT del emisor", "Dirección del emisor", "Correo del emisor", "Motivo del cambio"]) {
      expect(screen.getByLabelText(label)).toHaveProperty("required", true);
      expect(screen.getByLabelText(label).className).toContain("h-11");
    }
  });
  it("retains input and exact operation identity after an ambiguous failure, and focuses the error", async () => {
    mocks.save.mockResolvedValue({ issuer: null, error: "Sin conexión.", fieldErrors: {} });
    render(<IssuerForm issuer={issuer} operationId="operation" />);
    fireEvent.change(screen.getByLabelText("Razón social del emisor"), { target: { value: "Conservar nombre" } });
    fireEvent.change(screen.getByLabelText("Motivo del cambio"), { target: { value: "Ajustar emisor" } });
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    expect(document.activeElement).toBe(screen.getByRole("alert"));
    expect(screen.getByLabelText("Razón social del emisor")).toHaveProperty("value", "Conservar nombre");
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    const first = mocks.save.mock.calls[0][1] as FormData;
    const retry = mocks.save.mock.calls[1][1] as FormData;
    expect(first.get("operationId")).toBe(retry.get("operationId"));
    expect(first.get("expectedVersionId")).toBe(retry.get("expectedVersionId"));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("creates a new operation only when explicitly editing the payload after an attempt", async () => {
    mocks.save.mockResolvedValue({ issuer: null, error: "Revisa el RUT", fieldErrors: { taxId: "Inválido" } });
    render(<IssuerForm issuer={issuer} operationId="operation" />);
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    expect(document.activeElement).toBe(screen.getByLabelText("RUT del emisor"));
    fireEvent.change(screen.getByLabelText("RUT del emisor"), { target: { value: "10000013-K" } });
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    expect((mocks.save.mock.calls[1][1] as FormData).get("operationId")).not.toBe("operation");
    expect((mocks.save.mock.calls[1][1] as FormData).get("expectedVersionId")).toBe("old-version");
  });
  it("disables controls while pending and updates expected version after confirmed persistence", async () => {
    let finish!: (value: { issuer: BillingIssuer; error: null; fieldErrors: Record<string, string> }) => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<IssuerForm issuer={issuer} operationId="operation" />);
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(screen.getByRole("form").getAttribute("aria-busy")).toBe("true"));
    expect(screen.getByLabelText("Razón social del emisor").closest("fieldset")).toHaveProperty("disabled", true);
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);
    await act(async () => finish({ issuer: { ...issuer, id: "new-version", versionNumber: 2 }, error: null, fieldErrors: {} }));
    expect(screen.getByRole("status").textContent).toContain("versión 2");
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Dirección del emisor"), { target: { value: "Otra dirección" } });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button")).toHaveProperty("disabled", false);
    expect(screen.getByRole("form").querySelector<HTMLInputElement>('[name="expectedVersionId"]')?.value).toBe("new-version");
  });
});
