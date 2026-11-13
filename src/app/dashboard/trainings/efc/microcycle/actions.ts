"use server";

import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { saveMicrocycle, saveSrpe } from "@/application/efc-training/use-cases";

export async function saveMicrocycleAction(formData: FormData) {
  try {
    const membership = await requireOperationalMembership();
    const deps = await createEfcTrainingDeps();

    const loadsRaw = formData.get("loads");
    const loads = loadsRaw ? (JSON.parse(loadsRaw as string) as Array<{
      dayOfWeek: number; category: string; subcategory: string;
      minutes: number; notes: string | null; tenantId: string;
    }>) : [];

    const result = await saveMicrocycle(
      {
        macrocycleId: formData.get("macrocycleId") as string,
        weekNumber: Number(formData.get("weekNumber")),
        microcycleType: formData.get("microcycleType") as "AJ" | "C" | "I" | "AC" | "CO" | "R",
        intensityTarget: Number(formData.get("intensityTarget")),
        objective: (formData.get("objective") as string) ?? "",
        loads: loads.map((l) => ({ ...l, tenantId: membership.tenantId })),
      },
      { microcycles: deps.microcycles, macrocycles: deps.macrocycles },
    );
    return { success: true as const, id: result.id };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Error al guardar" };
  }
}

export async function saveSrpeAction(formData: FormData) {
  try {
    const membership = await requireOperationalMembership();
    const deps = await createEfcTrainingDeps();

    const result = await saveSrpe(
      {
        microcycleId: formData.get("microcycleId") as string,
        athleteId: formData.get("athleteId") as string,
        tenantId: membership.tenantId,
        dayOfWeek: Number(formData.get("dayOfWeek")),
        rpe: Number(formData.get("rpe")),
        durationMinutes: Number(formData.get("durationMinutes")),
      },
      { microcycles: deps.microcycles },
    );
    return { success: true as const, srpe: result.srpe };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Error al guardar sRPE" };
  }
}
