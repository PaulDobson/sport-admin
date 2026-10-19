import type {
  CancelPlanChangeInput, PlanChangeConfirmation, PlanChangePreview, PlanChangeRequest, PlanChangeResult,
} from "@/domain/saas-administration/plan-change-management";

export interface PlanChangePort {
  isPlatformAdmin(): Promise<boolean>;
  previewPlanChange(input: PlanChangeRequest): Promise<PlanChangePreview>;
  confirmPlanChange(input: PlanChangeConfirmation): Promise<PlanChangeResult>;
  cancelPlanChange(input: CancelPlanChangeInput): Promise<void>;
}
