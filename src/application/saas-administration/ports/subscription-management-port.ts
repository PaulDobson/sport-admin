import type {
  AssignmentConfirmation, AssignmentPreview, AssignmentRequest, AssignmentResult,
  SubscriptionManagement,
} from "@/domain/saas-administration/subscription-management";

export interface SubscriptionManagementPort {
  isPlatformAdmin(): Promise<boolean>;
  getManagement(tenantId: string): Promise<SubscriptionManagement>;
  previewAssignment(input: AssignmentRequest): Promise<AssignmentPreview>;
  confirmAssignment(input: AssignmentConfirmation): Promise<AssignmentResult>;
}
