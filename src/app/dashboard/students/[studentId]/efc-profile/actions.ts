"use server";

import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { upsertEfcProfile, saveAthleteTest } from "@/application/efc-training/use-cases";

export async function upsertEfcProfileAction(formData: FormData) {
  try {
    const membership = await requireOperationalMembership();
    const deps = await createEfcTrainingDeps();
    const result = await upsertEfcProfile(
      {
        athleteId: formData.get("athleteId") as string,
        tenantId: membership.tenantId,
        fcRest: formData.get("fcRest") ? Number(formData.get("fcRest")) : null,
        isSmoker: formData.get("isSmoker") === "true",
        efcPeriod: (formData.get("efcPeriod") as "E" | "F" | "C") ?? "E",
      },
      { profiles: deps.profiles },
    );
    return { success: true as const, id: result.id };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function savePhysicalTestAction(formData: FormData) {
  try {
    const membership = await requireOperationalMembership();
    const deps = await createEfcTrainingDeps();
    const parse = (key: string) => {
      const v = formData.get(key);
      return v && v !== "" ? Number(v) : null;
    };
    const result = await saveAthleteTest(
      {
        athleteId: formData.get("athleteId") as string,
        tenantId: membership.tenantId,
        evaluationDate: formData.get("evaluationDate") as string,
        abs1min: parse("abs1min"),
        seatAndReachCm: parse("seatAndReachCm"),
        pullUps: parse("pullUps"),
        pushUps1min: parse("pushUps1min"),
        sprint10x5Sec: parse("sprint10x5Sec"),
        waistCm: parse("waistCm"),
        enduranceMeters: parse("enduranceMeters"),
      },
      { profiles: deps.profiles },
    );
    return { success: true as const, id: result.id };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Error al guardar" };
  }
}
