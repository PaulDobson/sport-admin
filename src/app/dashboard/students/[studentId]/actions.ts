"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHealthRestriction } from "@/application/evolution-health-attendance/use-cases/manage-student-health";
import {
  correctStudentPersonalData,
  registerStudentHealthConsent,
  requestStudentErasure,
} from "@/application/evolution-health-attendance/use-cases/manage-student-privacy";
import { recordMetricEvaluation } from "@/application/evolution-health-attendance/use-cases/record-metric-evaluation";
import { updateMetricEvaluation } from "@/application/evolution-health-attendance/use-cases/update-metric-evaluation";
import { deleteMetricEvaluation } from "@/application/evolution-health-attendance/use-cases/delete-metric-evaluation";
import { createMetricDefinition } from "@/application/evolution-health-attendance/use-cases/create-metric-definition";
import { ensureDefaultMetricDefinitions } from "@/application/evolution-health-attendance/use-cases/list-metric-definitions";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { requireOperationalMembership } from "@/app/_lib/operational-context";

export interface StudentDetailFormState {
  error: string | null;
  saved: boolean;
}

async function getRequestMembership() {
  const membership = await requireOperationalMembership();
  if (membership.role === "assistant") redirect("/dashboard/students");
  return membership;
}

export async function createRestrictionAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await createHealthRestriction(
      {
        tenantId: actor.tenantId,
        studentId,
        description: String(formData.get("description") ?? ""),
        operationalAction: String(formData.get("operationalAction") ?? ""),
        severity: String(formData.get("severity") ?? "yellow") as
          | "red"
          | "yellow"
          | "green",
        source: "instructor_report",
        startsOn: String(formData.get("startsOn") ?? ""),
        endsOn: String(formData.get("endsOn") ?? "") || undefined,
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function registerConsentAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await registerStudentHealthConsent(
      {
        tenantId: actor.tenantId,
        studentId,
        policyVersion: String(formData.get("policyVersion") ?? ""),
        decision: String(formData.get("decision") ?? "") as
          | "granted"
          | "revoked",
        operationId: randomUUID(),
        representedConsentConfirmed:
          formData.get("representedConsentConfirmed") === "confirmed",
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function correctPersonalDataAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await correctStudentPersonalData(
      {
        tenantId: actor.tenantId,
        studentId,
        fullName: String(formData.get("fullName") ?? "") || undefined,
        birthDate: String(formData.get("birthDate") ?? "") || undefined,
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function requestErasureAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    await requestStudentErasure(
      {
        tenantId: actor.tenantId,
        studentId,
        reason: String(formData.get("reason") ?? "") as
          | "subject_request"
          | "consent_withdrawn"
          | "tenant_request",
      },
      await createEvolutionHealthAttendanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Evolution & Physical Evaluation actions
// ─────────────────────────────────────────────────────────────────────────────

export async function seedDefaultMetricsAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  try {
    const deps = await createEvolutionHealthAttendanceDeps();
    await ensureDefaultMetricDefinitions({ tenantId: actor.tenantId }, deps);
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(
    `/dashboard/students/${String(formData.get("studentId") ?? "")}`,
  );
  return { error: null, saved: true };
}

export async function recordEvaluationAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    const deps = await createEvolutionHealthAttendanceDeps();

    // Build values map: form has entries like "metric_<slug>=<value>"
    const values: Record<string, unknown> = {};
    for (const [key, raw] of formData.entries()) {
      if (!key.startsWith("metric_")) continue;
      const slug = key.slice("metric_".length);
      const str = String(raw).trim();
      if (str === "") continue;
      const num = Number(str);
      values[slug] = Number.isFinite(num) ? num : str;
    }

    if (Object.keys(values).length === 0) {
      return { error: "Ingresa al menos un valor para guardar.", saved: false };
    }

    const dateStr = String(formData.get("evaluatedAt") ?? "").trim();
    await recordMetricEvaluation(
      {
        tenantId: actor.tenantId,
        studentId,
        authorMembershipId: actor.id,
        evaluatedAt: dateStr ? new Date(dateStr) : new Date(),
        values,
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function deleteEvaluationAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  const evaluationId = String(formData.get("evaluationId") ?? "");
  try {
    const deps = await createEvolutionHealthAttendanceDeps();
    await deleteMetricEvaluation(
      { tenantId: actor.tenantId, evaluationId },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function createCustomMetricAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  try {
    const deps = await createEvolutionHealthAttendanceDeps();
    const name = String(formData.get("name") ?? "").trim();
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    const timeWindowRaw = String(
      formData.get("timeWindowSeconds") ?? "",
    ).trim();
    const timeWindowSeconds =
      timeWindowRaw !== "" ? parseInt(timeWindowRaw, 10) : undefined;

    await createMetricDefinition(
      {
        tenantId: actor.tenantId,
        slug: `custom-${slug}-${Date.now()}`,
        name,
        category:
          String(formData.get("category") ?? "Personalizado").trim() ||
          "Personalizado",
        evaluationType: "custom",
        valueType: "numeric",
        unit: String(formData.get("unit") ?? "").trim() || undefined,
        validationRules: {},
        timeWindowSeconds,
      },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}

export async function updateEvaluationAction(
  _previousState: StudentDetailFormState,
  formData: FormData,
): Promise<StudentDetailFormState> {
  const actor = await getRequestMembership();
  const studentId = String(formData.get("studentId") ?? "");
  const evaluationId = String(formData.get("evaluationId") ?? "");
  try {
    const deps = await createEvolutionHealthAttendanceDeps();

    const values: Record<string, unknown> = {};
    for (const [key, raw] of formData.entries()) {
      if (!key.startsWith("metric_")) continue;
      const slug = key.slice("metric_".length);
      const str = String(raw).trim();
      if (str === "") continue;
      const num = Number(str);
      values[slug] = Number.isFinite(num) ? num : str;
    }

    if (Object.keys(values).length === 0) {
      return { error: "Ingresa al menos un valor.", saved: false };
    }

    const dateStr = String(formData.get("evaluatedAt") ?? "").trim();
    await updateMetricEvaluation(
      {
        tenantId: actor.tenantId,
        evaluationId,
        evaluatedAt: dateStr ? new Date(dateStr) : new Date(),
        values,
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      },
      deps,
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return { error: null, saved: true };
}
