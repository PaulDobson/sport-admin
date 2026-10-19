import { describe, expect, it, vi } from "vitest";
import type { PlanCatalogPort } from "../ports/plan-catalog-port";
import { archiveSaasPlan, listSaasPlanCatalog, publishSaasPlanVersion } from "./manage-plan-catalog";

const id = "a1000000-0000-4000-8000-000000000001";
const versionId = "a1000000-0000-4000-8000-000000000002";
const input = {
  planId: null, expectedVersionId: null, operationId: id, reason: "Nueva oferta",
  terms: {
    name: "Academia Pro", description: null, price: 11900,
    durationUnit: "months", durationCount: 1, trialDays: 7,
    maxStudents: 100, maxUsers: 5, features: ["reports"], services: ["Capacitación"],
  },
};
function repository(admin = true): PlanCatalogPort {
  return {
    isPlatformAdmin: vi.fn().mockResolvedValue(admin),
    list: vi.fn().mockResolvedValue([]),
    publish: vi.fn().mockResolvedValue({ planId: id, versionId, versionNumber: 1 }),
    archive: vi.fn().mockResolvedValue(undefined),
  };
}

describe("commercial SaaS plan catalog", () => {
  it("publishes normalized commercial terms without mutating existing contracts", async () => {
    const port = repository();
    await expect(publishSaasPlanVersion({
      ...input, terms: { ...input.terms, name: "  Academia Pro  ", services: [" Capacitación "] },
    }, port)).resolves.toEqual({ planId: id, versionId, versionNumber: 1 });
    expect(port.publish).toHaveBeenCalledWith(input);
  });
  it.each([
    { price: 11900.5 }, { price: -1 }, { price: 10000000000 }, { price: NaN },
    { durationCount: 0 }, { durationCount: 1.5 }, { durationUnit: "years" },
    { maxStudents: 0 }, { maxUsers: -1 }, { trialDays: 366 },
    { features: ["unknown"] }, { features: ["reports", "reports"] },
    { services: [""] }, { services: ["x".repeat(501)] }, { services: Array(51).fill("Servicio") },
  ])("rejects invalid commercial terms %j before persistence", async (terms) => {
    const port = repository();
    await expect(publishSaasPlanVersion({ ...input, terms: { ...input.terms, ...terms } }, port))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(port.publish).not.toHaveBeenCalled();
  });
  it("requires a version on edit and refuses one on create", async () => {
    const port = repository();
    for (const change of [{ planId: id }, { expectedVersionId: versionId }]) {
      await expect(publishSaasPlanVersion({ ...input, ...change }, port)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
    expect(port.publish).not.toHaveBeenCalled();
  });
  it("permits free plans without inventing a nonzero price", async () => {
    const port = repository();
    await publishSaasPlanVersion({ ...input, terms: { ...input.terms, price: 0 } }, port);
    expect(port.publish).toHaveBeenCalledWith(expect.objectContaining({ terms: expect.objectContaining({ price: 0 }) }));
  });
  it("checks administrative access for reads, publication and archive", async () => {
    const port = repository(false);
    await expect(listSaasPlanCatalog(port)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(publishSaasPlanVersion(input, port)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(archiveSaasPlan({}, port)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(port.list).not.toHaveBeenCalled();
    expect(port.publish).not.toHaveBeenCalled();
    expect(port.archive).not.toHaveBeenCalled();
  });
  it("archives only an identified version with an auditable reason", async () => {
    const port = repository();
    const data = { planId: id, expectedVersionId: versionId, operationId: id, reason: "Retirar oferta" };
    await archiveSaasPlan(data, port);
    expect(port.archive).toHaveBeenCalledWith(data);
    await expect(archiveSaasPlan({ ...data, reason: "" }, port)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
