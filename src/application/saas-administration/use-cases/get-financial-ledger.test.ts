import { describe,expect,it,vi } from "vitest";
import { getFinancialLedger } from "./get-financial-ledger";
import { UnauthorizedError,ValidationError } from "@/domain/shared/errors";
import type { FinancialLedgerPort } from "../ports/financial-ledger-port";
const request = { period: "2026-10-01",currency: "CLP",metric: "mrr",page: 1 };
const port = () => ({ isPlatformAdmin: vi.fn().mockResolvedValue(true),get: vi.fn() } satisfies FinancialLedgerPort);
describe("financial metric drilldown",() => {
  it("requires platform-admin before reading historical records",async () => {
    const p = port(); p.isPlatformAdmin.mockResolvedValue(false); await expect(getFinancialLedger(request,p)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(p.get).not.toHaveBeenCalled();
  });
  it.each([{ period: "2026-10-02" },{ period: "2026-13-01" },{ currency: "clp" },{ metric: "all" },{ page: 0 },{ page: 1.5 }])("rejects invalid historical filter %j",async (patch) => {
    const p = port(); await expect(getFinancialLedger({ ...request,...patch },p)).rejects.toBeInstanceOf(ValidationError); expect(p.get).not.toHaveBeenCalled();
  });
  it.each(["mrr","collected","pending","past_due"])("passes exact selected month and currency for %s, never today's balance",async (metric) => {
    const p = port(); await getFinancialLedger({ ...request,metric,period: "2020-01-01",currency: "USD" },p);
    expect(p.get).toHaveBeenCalledWith({ period: "2020-01-01",currency: "USD",metric,page: 1 });
  });
});
