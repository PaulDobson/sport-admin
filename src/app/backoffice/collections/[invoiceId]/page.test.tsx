import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BusinessRuleViolationError, NotFoundError } from "@/domain/shared/errors";
import CollectionDetailPage from "./page";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({ shell: {}, deps: {
    collections: { isPlatformAdmin: async () => true, get: mocks.get },
    billingIssuer: { isPlatformAdmin: async () => true,get: async () => null },
    billingPayments: { listReceipts: async () => [] },
  } }),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/presentation/components/backoffice-shell", () => ({ BackofficeShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
const id = "ad480000-0000-4000-8000-000000000021";
const props = { params: Promise.resolve({ invoiceId: id }), searchParams: Promise.resolve({ back: "status=paid&page=2" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({
    businessDate: "2026-10-18", invoice: {
      id, tenantId: id, tenantName: "Academia", invoiceNumber: "INV-1", status: "paid", kind: "legacy", planName: null,
      currency: "CLP", amount: 11900, confirmedAmount: 0, balance: 0, dueOn: null,
      periodStartsOn: "2026-01-01", periodEndExclusive: "2026-02-01", importedSettlement: true, inFlightCount: 0,
    }, charges: [], refunds: [], chargeCount: 0, refundCount: 0,
  });
});
afterEach(cleanup);
describe("collection detail", () => {
  it("explains imported settlements and preserves the list context without offering fake mutations", async () => {
    render(await CollectionDetailPage(props));
    expect(screen.getByText(/importación histórica/)).toBeTruthy();
    expect(screen.getByText("Sin transacciones registradas.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a cobranza" }).getAttribute("href")).toBe("/backoffice/collections?status=paid&page=2");
    expect(screen.queryByRole("button", { name: /pago/i })).toBeNull();
  });
  it("returns not found for invalid identifiers without reading", async () => {
    await expect(CollectionDetailPage({ ...props, params: Promise.resolve({ invoiceId: "bad" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it("returns not found for missing invoices", async () => {
    mocks.get.mockRejectedValueOnce(new NotFoundError("Cobro", id));
    await expect(CollectionDetailPage(props)).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("does not convert missing schema into a 404", async () => {
    mocks.get.mockRejectedValueOnce(new BusinessRuleViolationError("Falta 0048"));
    render(await CollectionDetailPage(props));
    expect(screen.getByRole("alert").textContent).toBe("Falta 0048");
  });
});
