export interface SaasFinancialMetric {
  currency: string;
  mrr: number;
  arr: number;
  arpa: number;
  recurringTenants: number;
  churnedTenants: number;
  churnRate: number;
  trialsEnded: number;
  trialsConverted: number;
  trialConversionRate: number;
  collectedNet: number;
  pendingAmount: number;
  pastDueAmount: number;
  pastDueTenants: number;
}
