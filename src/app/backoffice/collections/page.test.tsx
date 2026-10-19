import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import SaasCollectionsPage from "./page";
import { collectionDetailHref, collectionFiltersFromSearch, collectionListHref } from "./collection-links";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({ shell: {}, deps: { collections: { isPlatformAdmin: async () => true, list: mocks.list } } }),
}));
vi.mock("@/presentation/components/backoffice-shell", () => ({
  BackofficeShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
const invoice = {
  id: "ad480000-0000-4000-8000-000000000021", tenantId: "ad480000-0000-4000-8000-000000000011",
  tenantName: "Academia Central", invoiceNumber: "INV-PARTIAL", status: "past_due", kind: "legacy",
  amount: 100, currency: "USD", balance: 69.75, confirmedAmount: 30.25, dueOn: "2026-01-01",
  planName: null, inFlightCount: 1, importedSettlement: false,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.list.mockResolvedValue({ businessDate: "2026-10-18", total: 41, page: 2, pageSize: 20, items: [invoice] });
});
afterEach(cleanup);
describe("collections page", () => {
  it("provides cards/table, historical currency and filter-preserving links", async () => {
    render(await SaasCollectionsPage({ searchParams: Promise.resolve({ q: "Central", status: "past_due", page: "2", currency: "USD" }) }));
    expect(within(screen.getByRole("table")).getByText("Academia Central")).toBeTruthy();
    expect(screen.getByLabelText("Academia")).toHaveProperty("value", "Central");
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toContain("page=3");
    expect(screen.getByRole("link", { name: "Anterior" }).getAttribute("href")).not.toContain("page=");
    expect(screen.getAllByRole("link", { name: "Ver detalle" })[0].getAttribute("href")).toContain("back=q%3DCentral");
    expect(screen.getAllByText(/operaciones en curso/)).toHaveLength(2);
    expect(screen.getAllByText(/69,75/).length).toBeGreaterThan(0);
  });
  it("displays invalid URL filters without fetching unfiltered data", async () => {
    render(await SaasCollectionsPage({ searchParams: Promise.resolve({ from: "2026-10-18", until: "2026-10-01" }) }));
    expect(screen.getByRole("alert").textContent).toContain("anterior");
    expect(mocks.list).not.toHaveBeenCalled();
    expect(screen.queryByText("Sin cobros en esta página")).toBeNull();
    expect(screen.getByLabelText("Vencimiento hasta")).toHaveProperty("value", "2026-10-01");
  });
  it("reports missing migrations as error, not a debt-free empty state", async () => {
    mocks.list.mockRejectedValueOnce(new BusinessRuleViolationError("Aplica la migración SaaS 0048."));
    render(await SaasCollectionsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert").textContent).toContain("0048");
    expect(screen.queryByText("Sin cobros en esta página")).toBeNull();
  });
  it("offers navigation out of an empty out-of-range page", async () => {
    mocks.list.mockResolvedValueOnce({ businessDate: "2026-10-18", total: 1, page: 2, pageSize: 20, items: [] });
    render(await SaasCollectionsPage({ searchParams: Promise.resolve({ page: "2" }) }));
    expect(screen.getByText("Sin cobros en esta página")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Anterior" })).toBeTruthy();
  });
  it("does not disguise unexpected failures", async () => {
    mocks.list.mockRejectedValueOnce(new Error("offline"));
    await expect(SaasCollectionsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("offline");
  });
});
describe("collection links", () => {
  it("roundtrips all filters and page safely", () => {
    const filters = collectionFiltersFromSearch({ tenant: invoice.tenantId, q: "A&B 100%", status: "paid",
      currency: "usd", from: "2026-01-01", until: "2026-10-18", page: "2" });
    const href = collectionListHref(filters);
    const query = Object.fromEntries(new URL(href, "https://example.invalid").searchParams);
    expect(collectionFiltersFromSearch(query)).toEqual(filters);
    expect(collectionDetailHref(invoice.id, filters)).toContain(encodeURIComponent("A%26B"));
  });
  it.each(["0", "1.5", "wrong", "1000001"])("rejects invalid page %s", (page) => {
    expect(() => collectionFiltersFromSearch({ page })).toThrow();
  });
  it("rejects repeated URL filter values instead of crashing or silently selecting one", () => {
    expect(() => collectionFiltersFromSearch({ currency: ["CLP", "USD"] })).toThrow();
  });
});
