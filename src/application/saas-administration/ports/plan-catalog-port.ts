import type {
  ArchiveSaasPlanInput,
  PublishSaasPlanInput,
  SaasCatalogPlan,
} from "@/domain/saas-administration/plan-catalog";

export interface PlanCatalogPort {
  isPlatformAdmin(): Promise<boolean>;
  list(): Promise<SaasCatalogPlan[]>;
  publish(input: PublishSaasPlanInput): Promise<{
    planId: string;
    versionId: string;
    versionNumber: number;
  }>;
  archive(input: ArchiveSaasPlanInput): Promise<void>;
}
