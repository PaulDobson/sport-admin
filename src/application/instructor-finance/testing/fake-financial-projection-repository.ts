import type {
  FinancialProjectionData,
  FinancialProjectionRepositoryPort,
} from "../ports/financial-projection-repository-port";

export class FakeFinancialProjectionRepository implements FinancialProjectionRepositoryPort {
  data: FinancialProjectionData = {
    memberships: [],
    payments: [],
    adjustments: [],
  };
  /** Optional per-period data; periods without an entry fall back to `data`. */
  dataByPeriod: Record<string, FinancialProjectionData> = {};
  readonly requests: Array<{ tenantId: string; period: string }> = [];

  async loadMonth(tenantId: string, period: string) {
    this.requests.push({ tenantId, period });
    return this.dataByPeriod[period] ?? this.data;
  }
}
