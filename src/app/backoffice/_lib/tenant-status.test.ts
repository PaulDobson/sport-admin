import { describe, expect, it } from "vitest";
import type { TenantBackofficeSummary } from "@/domain/saas-administration/tenant-backoffice";
import {
  countTenantsByStatus,
  filterTenants,
  isTenantStatus,
} from "./tenant-status";

const tenants: TenantBackofficeSummary[] = [
  {
    id: "1",
    address: "Av. Central 123", contactName: "María Soto", contactEmail: "maria@academia.cl", phone: "+56 9 1234 5678", city: "Santiago", region: "Metropolitana",
    name: "Box Norte",
    status: "active",
    billingContactName: "Ana Pérez",
    billingContactEmail: "ana@boxnorte.cl",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "2",
    address: null, contactName: null, contactEmail: null, phone: null, city: null, region: null,
    name: "Crossfit Sur",
    status: "trial",
    billingContactName: null,
    billingContactEmail: null,
    createdAt: new Date("2026-02-01"),
  },
  {
    id: "3",
    address: null, contactName: null, contactEmail: null, phone: null, city: null, region: null,
    name: "Yoga Centro",
    status: "active",
    billingContactName: null,
    billingContactEmail: "pagos@yoga.cl",
    createdAt: new Date("2026-03-01"),
  },
];

describe("tenant status helpers", () => {
  it.each(["MARÍA", "maria@academia.cl", "1234 5678", "central 123", "santiago", "metropolitana"])("searches gym details by %s", query => {
    expect(filterTenants(tenants, { query }).map(tenant => tenant.id)).toEqual(["1"]);
  });
  it("validates tenant statuses from query strings", () => {
    expect(isTenantStatus("active")).toBe(true);
    expect(isTenantStatus("deleted")).toBe(false);
    expect(isTenantStatus(undefined)).toBe(false);
  });

  it("counts tenants per status including empty buckets", () => {
    expect(countTenantsByStatus(tenants)).toEqual({
      active: 2,
      trial: 1,
      pending: 0,
      suspended: 0,
      cancelled: 0,
    });
  });

  it("filters by status and case-insensitive name or contact", () => {
    expect(filterTenants(tenants, { status: "active" }).map((t) => t.id)).toEqual([
      "1",
      "3",
    ]);
    expect(filterTenants(tenants, { query: "ANA" }).map((t) => t.id)).toEqual(["1"]);
    expect(filterTenants(tenants, { query: "yoga.cl" }).map((t) => t.id)).toEqual(["3"]);
    expect(
      filterTenants(tenants, { status: "trial", query: "box" }),
    ).toHaveLength(0);
  });
});
