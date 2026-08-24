import type {
  ConsentDecision,
  ErasureReason,
  StudentPersonalDataExport,
  StudentPrivacyState,
} from "@/domain/evolution-health-attendance/privacy";

export interface PrivacyRepositoryPort {
  getStudentState(
    tenantId: string,
    studentId: string,
  ): Promise<StudentPrivacyState>;
  registerConsent(input: {
    tenantId: string;
    studentId: string;
    policyVersion: string;
    decision: ConsentDecision;
    operationId: string;
  }): Promise<string>;
  exportPersonalData(
    tenantId: string,
    studentId: string,
  ): Promise<StudentPersonalDataExport>;
  correctPersonalData(input: {
    tenantId: string;
    studentId: string;
    fullName?: string;
    birthDate?: string;
  }): Promise<void>;
  requestErasure(input: {
    tenantId: string;
    studentId: string;
    reason: ErasureReason;
  }): Promise<string>;
}
