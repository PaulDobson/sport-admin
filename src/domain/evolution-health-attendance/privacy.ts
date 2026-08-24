export type ConsentDecision = "granted" | "revoked";
export type ErasureReason =
  | "subject_request"
  | "consent_withdrawn"
  | "tenant_request";
export type ErasureStatus =
  | "pending"
  | "approved"
  | "blocked"
  | "cancelled"
  | "completed";

export interface StudentPrivacyState {
  policyApproved: boolean;
  healthEnabled: boolean;
  jurisdictionCode?: string;
  policyVersion?: string;
  hasCurrentConsent: boolean;
  erasureRequest?: {
    status: ErasureStatus;
    requestedAt: Date;
    executeAfter: Date;
    retentionHold: boolean;
  };
}

export type StudentPersonalDataExport = Record<string, unknown>;
