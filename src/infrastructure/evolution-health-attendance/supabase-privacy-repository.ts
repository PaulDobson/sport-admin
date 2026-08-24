import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrivacyRepositoryPort } from "@/application/evolution-health-attendance/ports/privacy-repository-port";
import type {
  ErasureStatus,
  StudentPersonalDataExport,
} from "@/domain/evolution-health-attendance/privacy";

export class SupabasePrivacyRepository implements PrivacyRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async getStudentState(tenantId: string, studentId: string) {
    const [policy, consent, erasure] = await Promise.all([
      this.client
        .from("tenant_privacy_policies")
        .select("jurisdiction_code,policy_version,status,health_enabled")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      this.client.rpc("has_current_health_consent", {
        target_tenant: tenantId,
        target_student: studentId,
      }),
      this.client
        .from("student_erasure_requests")
        .select("status,requested_at,execute_after,retention_hold")
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .in("status", ["pending", "approved", "blocked"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (policy.error) throw policy.error;
    if (consent.error) throw consent.error;
    if (erasure.error) throw erasure.error;

    return {
      policyApproved: policy.data?.status === "approved",
      healthEnabled:
        policy.data?.status === "approved" && policy.data.health_enabled,
      jurisdictionCode: policy.data?.jurisdiction_code,
      policyVersion: policy.data?.policy_version,
      hasCurrentConsent: consent.data === true,
      erasureRequest: erasure.data
        ? {
            status: erasure.data.status as ErasureStatus,
            requestedAt: new Date(erasure.data.requested_at),
            executeAfter: new Date(erasure.data.execute_after),
            retentionHold: erasure.data.retention_hold,
          }
        : undefined,
    };
  }

  async registerConsent(
    input: Parameters<PrivacyRepositoryPort["registerConsent"]>[0],
  ) {
    const { data, error } = await this.client.rpc("register_health_consent", {
      target_tenant: input.tenantId,
      target_student: input.studentId,
      target_policy_version: input.policyVersion,
      target_decision: input.decision,
      target_operation_id: input.operationId,
    });
    if (error || !data) throw error ?? new Error("Failed to register consent");
    return String(data);
  }

  async exportPersonalData(tenantId: string, studentId: string) {
    const { data, error } = await this.client.rpc(
      "export_student_personal_data",
      {
        target_tenant: tenantId,
        target_student: studentId,
      },
    );
    if (error || !data)
      throw error ?? new Error("Failed to export personal data");
    return data as StudentPersonalDataExport;
  }

  async correctPersonalData(
    input: Parameters<PrivacyRepositoryPort["correctPersonalData"]>[0],
  ) {
    const { error } = await this.client.rpc("correct_student_personal_data", {
      target_tenant: input.tenantId,
      target_student: input.studentId,
      corrected_full_name: input.fullName,
      corrected_birth_date: input.birthDate,
    });
    if (error) throw error;
  }

  async requestErasure(
    input: Parameters<PrivacyRepositoryPort["requestErasure"]>[0],
  ) {
    const { data, error } = await this.client.rpc("request_student_erasure", {
      target_tenant: input.tenantId,
      target_student: input.studentId,
      target_reason_code: input.reason,
    });
    if (error || !data)
      throw error ?? new Error("Failed to request student erasure");
    return String(data);
  }
}
