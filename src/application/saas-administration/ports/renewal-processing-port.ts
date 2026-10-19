import type { RenewalProcessingRequest, RenewalProcessingResult, RenewalProcessorStatus } from "@/domain/saas-administration/renewal-processing";

export interface RenewalProcessingPort {
  process(input: RenewalProcessingRequest): Promise<RenewalProcessingResult>;
}
export interface RenewalAdministrationPort extends RenewalProcessingPort {
  isPlatformAdmin(): Promise<boolean>;
  getStatus(tenantId: string | null): Promise<RenewalProcessorStatus>;
}
