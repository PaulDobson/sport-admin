import type { DocumentJobFilters, DocumentJobsPage } from "@/domain/saas-administration/document-jobs";

export interface DocumentJobsPort {
  isPlatformAdmin(): Promise<boolean>;
  listDocumentJobs(filters: DocumentJobFilters): Promise<DocumentJobsPage>;
}
