import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import BillingIssuerPage from "./page";
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({ shell: {}, deps: { billingIssuer: { isPlatformAdmin: async () => true, get: mocks.get } } }),
}));
vi.mock("@/presentation/components/backoffice-shell", () => ({ BackofficeShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("./issuer-form", () => ({ IssuerForm: () => <div>Formulario de emisor</div> }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
describe("issuer page", () => {
  it("shows explicit missing issuer and separates PDF/email readiness", async () => {
    mocks.get.mockResolvedValue(null);
    render(await BillingIssuerPage());
    expect(screen.getByRole("status").textContent).toContain("Sin emisor configurado");
    expect(screen.getByText(/no envía mensajes ni acredita/)).toBeTruthy();
    expect(screen.getByText("Formulario de emisor")).toBeTruthy();
  });
  it("does not render a writable form when schema is missing", async () => {
    mocks.get.mockRejectedValue(new BusinessRuleViolationError("Falta 0048"));
    render(await BillingIssuerPage());
    expect(screen.getByRole("alert").textContent).toBe("Falta 0048");
    expect(screen.queryByText("Formulario de emisor")).toBeNull();
  });
});
