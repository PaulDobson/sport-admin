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

  async loadMonth() {
    return this.data;
  }
}
