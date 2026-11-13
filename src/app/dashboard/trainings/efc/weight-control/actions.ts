"use server";

import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { saveWeightControl } from "@/application/efc-training/use-cases";

export async function saveWeightControlAction(formData: FormData) {
  try {
    const membership = await requireOperationalMembership();
    const deps = await createEfcTrainingDeps();
    const result = await saveWeightControl(
      {
        athleteId: formData.get("athleteId") as string,
        tenantId: membership.tenantId,
        recordDate: formData.get("recordDate") as string,
        weightKg: Number(formData.get("weightKg")),
        categoryName: formData.get("categoryName") as string,
        categoryLimitKg: Number(formData.get("categoryLimitKg")),
      },
      { weightControl: deps.weightControl },
    );
    return { success: true as const, id: result.id };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Error al guardar" };
  }
}
