import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingIssuerPort } from "../ports/billing-issuer-port";
import type { CollectionsPort } from "../ports/collections-port";
import { getSaasBillingIssuer, saveSaasBillingIssuer } from "./manage-billing-issuer";
import { getSaasCollection, listSaasCollections, parseCollectionFilters } from "./list-collections";

const id = "ad480000-0000-4000-8000-000000000001";
const issuerPort: BillingIssuerPort = { isPlatformAdmin: vi.fn(), get: vi.fn(), save: vi.fn() };
const collections: CollectionsPort = { isPlatformAdmin: vi.fn(), list: vi.fn(), get: vi.fn() };
const valid = { operationId: id, expectedVersionId: null, legalName: " Plataforma ",
  taxId: " 12.345.678-5 ", address: " Calle 1 ", email: " emisor@example.invalid ", reason: " Configuración inicial " };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(issuerPort.isPlatformAdmin).mockResolvedValue(true);
  vi.mocked(collections.isPlatformAdmin).mockResolvedValue(true);
});
describe("billing administration use cases", () => {
  it("normalizes issuer fields and preserves the operation and expected version", async () => {
    await saveSaasBillingIssuer(valid, issuerPort);
    expect(issuerPort.save).toHaveBeenCalledWith({ ...valid, legalName: "Plataforma", taxId: "12345678-5",
      address: "Calle 1", email: "emisor@example.invalid", reason: "Configuración inicial" });
  });
  it.each([
    { taxId: "12345678-0" }, { email: "not-an-email" }, { legalName: "" }, { address: " " },
    { operationId: "not-a-uuid" }, { reason: "ab" }, { expectedVersionId: "" },
  ])("rejects invalid issuer %j without writing", async (patch) => {
    await expect(saveSaasBillingIssuer({ ...valid, ...patch }, issuerPort)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(issuerPort.save).not.toHaveBeenCalled();
  });
  it("does not invent configuration when no issuer is installed", async () => {
    vi.mocked(issuerPort.get).mockResolvedValue(null);
    expect(await getSaasBillingIssuer(issuerPort)).toBeNull();
  });
  it("uses explicit defaults for an unfiltered collection list", async () => {
    await listSaasCollections({}, collections);
    expect(collections.list).toHaveBeenCalledWith({
      tenantId: null, query: "", status: "all", currency: null, dueFrom: null, dueUntil: null, page: 1, pageSize: 20,
    });
  });
  it.each([
    { page: 0 }, { page: 1.5 }, { page: 1000001 }, { pageSize: 101 }, { status: "unknown" },
    { currency: "clp" }, { dueFrom: "2026-02-30" }, { dueFrom: "2026-10-02", dueUntil: "2026-10-01" },
    { tenantId: "wrong" }, { query: "x".repeat(161) },
  ])("rejects invalid filters %j rather than displaying unfiltered results", async (filters) => {
    await expect(listSaasCollections(filters, collections)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(collections.list).not.toHaveBeenCalled();
  });
  it("validates detail identifiers", async () => {
    await getSaasCollection(id, collections);
    expect(collections.get).toHaveBeenCalledWith(id);
    await expect(getSaasCollection("../another", collections)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("preserves explicit currency and calendar date boundaries", () => {
    expect(parseCollectionFilters({ currency: "USD", dueFrom: "2028-02-29", dueUntil: "2028-03-01" }))
      .toMatchObject({ currency: "USD", dueFrom: "2028-02-29", dueUntil: "2028-03-01" });
  });
  it("rejects every read/write surface before accessing data for non-admins", async () => {
    vi.mocked(issuerPort.isPlatformAdmin).mockResolvedValue(false);
    vi.mocked(collections.isPlatformAdmin).mockResolvedValue(false);
    for (const action of [() => getSaasBillingIssuer(issuerPort), () => saveSaasBillingIssuer(valid, issuerPort),
      () => listSaasCollections({}, collections), () => getSaasCollection(id, collections)]) {
      await expect(action()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(issuerPort.save).not.toHaveBeenCalled();
    expect(issuerPort.get).not.toHaveBeenCalled();
    expect(collections.list).not.toHaveBeenCalled();
    expect(collections.get).not.toHaveBeenCalled();
  });
});
