"use server";

import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { saveOneRm } from "@/application/efc-training/use-cases/save-one-rm";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import type { OneRmEfcRecommendation } from "@/domain/efc-training";

/**
 * saveOneRmAction — Server Action
 *
 * Reads fields from FormData, persists a new 1RM record via the `saveOneRm`
 * use case and returns enriched data including EFC recommendations when a
 * matching athlete profile exists.
 */
export async function saveOneRmAction(
  formData: FormData,
): Promise<
  | { success: true; id: string; recommendation: OneRmEfcRecommendation | null }
  | { success: false; error: string }
> {
  try {
    const membership = await requireOperationalMembership();

    const athleteId = formData.get("athleteId");
    const exercise = formData.get("exercise");
    const weightKg = formData.get("weightKg");
    const repsPerformed = formData.get("repsPerformed");
    const rir = formData.get("rir");
    const rpe = formData.get("rpe");
    const evaluationDate = formData.get("evaluationDate");

    if (
      typeof athleteId !== "string" ||
      typeof exercise !== "string" ||
      typeof weightKg !== "string" ||
      typeof repsPerformed !== "string" ||
      typeof rir !== "string" ||
      typeof evaluationDate !== "string"
    ) {
      return { success: false, error: "Faltan campos obligatorios." };
    }

    const deps = await createEfcTrainingDeps();
    const result = await saveOneRm(
      {
        athleteId,
        tenantId: membership.tenantId,
        exercise: exercise as "squat" | "bench_press" | "deadlift" | "other",
        weightKg: parseFloat(weightKg),
        repsPerformed: parseInt(repsPerformed, 10),
        rir: parseInt(rir, 10),
        rpe:
          typeof rpe === "string" && rpe.trim() !== ""
            ? parseFloat(rpe)
            : null,
        evaluationDate,
      },
      {
        oneRm: deps.oneRm,
        profiles: deps.profiles,
      },
    );

    return {
      success: true,
      id: result.record.id,
      recommendation: result.recommendation,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al guardar.";
    return { success: false, error: message };
  }
}
