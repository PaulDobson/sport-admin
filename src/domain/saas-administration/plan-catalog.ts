import type { SaasFeature } from "./plan-entitlement";

export interface SaasPlanTerms {
  name: string;
  description: string | null;
  price: number;
  durationUnit: "days" | "months";
  durationCount: number;
  trialDays: number;
  maxStudents: number;
  maxUsers: number;
  features: SaasFeature[];
  services: string[];
}

export interface SaasPlanVersion extends SaasPlanTerms {
  id: string;
  versionNumber: number;
  currency: string;
  legacy: boolean;
  createdAt: string;
}

export interface SaasCatalogPlan {
  id: string;
  slug: string;
  status: "active" | "archived";
  currentVersion: SaasPlanVersion;
}

export interface SaasPlanVersionHistory {
  planId: string;
  slug: string;
  status: "active" | "archived";
  currentVersionId: string | null;
  queriedAt: string;
  page: number;
  pageSize: number;
  total: number;
  versions: SaasPlanVersion[];
}

export interface PublishSaasPlanInput {
  planId: string | null;
  expectedVersionId: string | null;
  operationId: string;
  terms: SaasPlanTerms;
  reason: string;
}

export interface ArchiveSaasPlanInput {
  planId: string;
  expectedVersionId: string;
  operationId: string;
  reason: string;
}
