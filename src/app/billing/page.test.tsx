import { cleanup,render,screen } from "@testing-library/react";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import type { OwnerBilling } from "@/domain/saas-administration/owner-billing";
import { UnauthorizedError } from "@/domain/shared/errors";
import OwnerBillingPage from "./page";
const m = vi.hoisted(() => ({ user: vi.fn(),active: vi.fn(),operational: vi.fn(),get: vi.fn() }));
vi.mock("@/infrastructure/composition/auth-composition",() => ({ createAuthDeps: async () => ({
  auth: { getCurrentUserId: m.user },memberships: { findActiveByUser: m.active,findOperationalByUser: m.operational },
}) }));
vi.mock("@/infrastructure/composition/owner-billing-composition",() => ({ createOwnerBillingDeps: async () => ({ ownerBilling: { get: m.get } }) }));
vi.mock("@/app/dashboard/profile/sign-out-action",() => ({ signOutAction: vi.fn() }));
vi.mock("next/navigation",() => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
const id = "ad490000-0000-4000-8000-000000000011",otherId = "ad490000-0000-4000-8000-000000000012";
const billing: OwnerBilling = { tenant_id: id,tenant_name: "Academia Ñandú",tenant_status: "suspended",owner_tenants: [{ id,name: "Academia Ñandú" }],
  balances: [{ currency: "CLP",amount: 11900 }],subscription: null,scheduled_change: null,page: 1,total: 1,
  invoices: [{ id,invoice_number: "INV-1",amount: 11900,currency: "CLP",balance: 0,status: "paid",due_on: null,imported_settlement: false,
    receipts: [{ id,folio: 42,total: 11900,ready: true }],payments: [{ amount: 11900,currency: "CLP",occurred_at: "2026-10-18T00:00:00Z",status: "succeeded" }] }] };
const page = (params = {}) => OwnerBillingPage({ searchParams: Promise.resolve(params) });
beforeEach(() => {
  vi.resetAllMocks(); m.user.mockResolvedValue("owner"); m.active.mockResolvedValue([{ tenantId: id,role: "owner" }]);
  m.operational.mockResolvedValue([]); m.get.mockResolvedValue(billing);
});
afterEach(cleanup);
describe("owner-only standalone billing",() => {
  it("uses Spanish feature labels and preserves unknown historical features",async () => {
    m.get.mockResolvedValue({ ...billing,subscription: {
      id,status: "active",payment_status: "paid",plan_name: "Plan de prueba",
      price: 11900,currency: "CLP",period_starts_on: "2026-10-18",period_end_exclusive: "2026-11-18",
      duration_unit: "months",duration_count: 1,services: [],max_students: 100,max_users: 5,
      features: ["reports","offline","realtime","push","legacy-feature"],
    } });
    render(await page());
    expect(screen.getByText("Funciones: Reportes, Modo sin conexión, Tiempo real, Notificaciones push, legacy-feature")).toBeTruthy();
  });
  it("redirects an anonymous session without attempting billing access",async () => {
    m.user.mockResolvedValue(null); await expect(page()).rejects.toThrow("REDIRECT:/log-in?next=/billing"); expect(m.get).not.toHaveBeenCalled();
  });
  it.each(["admin","instructor","assistant"])("does not permit operational role %s",async (role) => {
    m.active.mockResolvedValue([{ tenantId: id,role }]); render(await page()); expect(screen.getByRole("alert").textContent).toContain("dueño");
    expect(m.get).not.toHaveBeenCalled();
  });
  it("does not allow cross-tenant query parameters",async () => {
    render(await page({ tenant: otherId })); expect(screen.getByRole("alert")).toBeTruthy(); expect(m.get).not.toHaveBeenCalled();
  });
  it("allows a suspended active owner to read debt and own receipts without operational or write access",async () => {
    render(await page()); expect(m.get).toHaveBeenCalledWith(id,1);
    expect(screen.getByText(/Esta consulta no reactiva/)).toBeTruthy();
    expect(screen.getByText(/Deuda total/).textContent).toContain("11.900");
    expect(screen.getByRole("link",{ name: "Descargar comprobante 42" }).getAttribute("href")).toBe(`/api/saas/receipts/${id}/download`);
    expect(screen.queryByRole("link",{ name: "Volver a la plataforma" })).toBeNull();
    expect(screen.queryByRole("button",{ name: /pago|enviar|anular/i })).toBeNull();
  });
  it("surfaces revocation rechecked by the database without leaking billing data",async () => {
    m.get.mockRejectedValue(new UnauthorizedError("Membresía revocada")); render(await page());
    expect(screen.getByRole("alert").textContent).toBe("Membresía revocada"); expect(screen.queryByText("INV-1")).toBeNull();
  });
  it("rejects invalid page instead of making an unbounded request",async () => {
    render(await page({ page: "0" })); expect(screen.getByRole("alert")).toBeTruthy(); expect(m.get).not.toHaveBeenCalled();
  });
});
