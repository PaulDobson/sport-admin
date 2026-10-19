import type { SaasPlanVersionHistory } from "@/domain/saas-administration/plan-catalog";

export interface PlanVersionHistoryPort {
  isPlatformAdmin(): Promise<boolean>;
  listVersions(input: { planId: string; page: number; pageSize: number }): Promise<SaasPlanVersionHistory>;
}
