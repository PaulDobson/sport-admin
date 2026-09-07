import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { SaasFinancialDashboardPort } from "@/application/saas-administration/ports/saas-financial-dashboard-port";

interface FinancialMetricRow {
  currency: string;
  mrr: number | string;
  arr: number | string;
  arpa: number | string;
  recurring_tenants: number | string;
  churned_tenants: number | string;
  churn_rate: number | string;
  trials_ended: number | string;
  trials_converted: number | string;
  trial_conversion_rate: number | string;
  collected_net: number | string;
  pending_amount: number | string;
  past_due_amount: number | string;
  past_due_tenants: number | string;
}

export class SupabaseSaasFinancialDashboard implements SaasFinancialDashboardPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async isPlatformAdmin(): Promise<boolean> {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throw error;
    return data === true;
  }

  async getMonthlyMetrics(periodStart: string) {
    const { data, error } = await this.client.rpc(
      "get_saas_financial_dashboard",
      { target_period: periodStart },
    );
    if (error) throw error;
    return ((data ?? []) as FinancialMetricRow[]).map((row) => ({
      currency: row.currency,
      mrr: Number(row.mrr),
      arr: Number(row.arr),
      arpa: Number(row.arpa),
      recurringTenants: Number(row.recurring_tenants),
      churnedTenants: Number(row.churned_tenants),
      churnRate: Number(row.churn_rate),
      trialsEnded: Number(row.trials_ended),
      trialsConverted: Number(row.trials_converted),
      trialConversionRate: Number(row.trial_conversion_rate),
      collectedNet: Number(row.collected_net),
      pendingAmount: Number(row.pending_amount),
      pastDueAmount: Number(row.past_due_amount),
      pastDueTenants: Number(row.past_due_tenants),
    }));
  }
}
