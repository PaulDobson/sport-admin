import type { SaasFinancialMetric } from "@/domain/saas-administration/financial-dashboard";

export interface SaasFinancialDashboardPort {
  isPlatformAdmin(): Promise<boolean>;
  getMonthlyMetrics(periodStart: string): Promise<SaasFinancialMetric[]>;
}
