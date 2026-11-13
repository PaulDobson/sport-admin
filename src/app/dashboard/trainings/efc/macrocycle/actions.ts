"use server";

import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { saveMacrocycle } from "@/application/efc-training/use-cases/save-macrocycle";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { z } from "zod";
import { computeFullMacrocycleDistribution } from "@/domain/efc-training";

/**
 * saveMacrocycleAction — Server Action
 *
 * Reads fields from FormData, validates them, and persists a new EFC macrocycle.
 * Returns `{ success: true, id }` on success or `{ success: false, error }` on
 * validation / domain failure.
 */
export async function saveMacrocycleAction(
  formData: FormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const membership = await requireOperationalMembership();

    const athleteId = formData.get("athleteId");
    const startDate = formData.get("startDate");
    const competitionDate = formData.get("competitionDate");
    const hoursPerSession = formData.get("hoursPerSession");
    const trainingDaysPerWeek = formData.get("trainingDaysPerWeek");
    const sessionsPerDay = formData.get("sessionsPerDay");
    const ePercentage = formData.get("ePercentage");
    const fPercentage = formData.get("fPercentage");
    const cPercentage = formData.get("cPercentage");
    const justification = formData.get("justification");

    // Basic presence check before Zod (friendlier error messages)
    if (
      typeof athleteId !== "string" ||
      typeof startDate !== "string" ||
      typeof competitionDate !== "string" ||
      typeof hoursPerSession !== "string" ||
      typeof trainingDaysPerWeek !== "string"
    ) {
      return { success: false, error: "Faltan campos obligatorios." };
    }

    const deps = await createEfcTrainingDeps();
    const result = await saveMacrocycle(
      {
        athleteId,
        tenantId: membership.tenantId,
        startDate,
        competitionDate,
        hoursPerSession: parseFloat(hoursPerSession),
        trainingDaysPerWeek: parseInt(trainingDaysPerWeek, 10),
        sessionsPerDay: sessionsPerDay
          ? parseInt(String(sessionsPerDay), 10)
          : 1,
        ePercentage: ePercentage ? parseInt(String(ePercentage), 10) : 50,
        fPercentage: fPercentage ? parseInt(String(fPercentage), 10) : 30,
        cPercentage: cPercentage ? parseInt(String(cPercentage), 10) : 20,
        justification:
          typeof justification === "string" && justification.trim().length > 0
            ? justification.trim()
            : null,
      },
      deps,
    );

    return { success: true, id: result.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al guardar.";
    return { success: false, error: message };
  }
}

// ─── Update schema ────────────────────────────────────────────────────────────

const updateMacrocycleSchema = z
  .object({
    startDate: z.iso.date(),
    competitionDate: z.iso.date(),
    hoursPerSession: z.number().min(0.5).max(8.0),
    trainingDaysPerWeek: z.number().int().min(1).max(7),
    sessionsPerDay: z.number().int().min(1).max(5),
    ePercentage: z.number().int().min(0).max(100),
    fPercentage: z.number().int().min(0).max(100),
    cPercentage: z.number().int().min(0).max(100),
    justification: z.string().max(1000).nullable(),
  })
  .refine((d) => d.ePercentage + d.fPercentage + d.cPercentage === 100, {
    message: "Los porcentajes E + F + C deben sumar 100",
  })
  .refine((d) => d.startDate < d.competitionDate, {
    message: "La fecha de competencia debe ser posterior a la fecha de inicio",
  });

/**
 * updateMacrocycleAction — Server Action
 *
 * Reads fields from FormData and updates an existing EFC macrocycle by id.
 * Returns `{ success: true, id }` on success or `{ success: false, error }` on
 * validation / domain failure.
 */
export async function updateMacrocycleAction(
  macrocycleId: string,
  formData: FormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const membership = await requireOperationalMembership();

    const startDate = formData.get("startDate");
    const competitionDate = formData.get("competitionDate");
    const hoursPerSession = formData.get("hoursPerSession");
    const trainingDaysPerWeek = formData.get("trainingDaysPerWeek");
    const sessionsPerDay = formData.get("sessionsPerDay");
    const ePercentage = formData.get("ePercentage");
    const fPercentage = formData.get("fPercentage");
    const cPercentage = formData.get("cPercentage");
    const justification = formData.get("justification");

    if (
      typeof startDate !== "string" ||
      typeof competitionDate !== "string" ||
      typeof hoursPerSession !== "string" ||
      typeof trainingDaysPerWeek !== "string"
    ) {
      return { success: false, error: "Faltan campos obligatorios." };
    }

    const parsed = updateMacrocycleSchema.safeParse({
      startDate,
      competitionDate,
      hoursPerSession: parseFloat(hoursPerSession),
      trainingDaysPerWeek: parseInt(trainingDaysPerWeek, 10),
      sessionsPerDay: sessionsPerDay ? parseInt(String(sessionsPerDay), 10) : 1,
      ePercentage: ePercentage ? parseInt(String(ePercentage), 10) : 50,
      fPercentage: fPercentage ? parseInt(String(fPercentage), 10) : 30,
      cPercentage: cPercentage ? parseInt(String(cPercentage), 10) : 20,
      justification:
        typeof justification === "string" && justification.trim().length > 0
          ? justification.trim()
          : null,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    // Verify domain constraint: at least 10 weeks
    computeFullMacrocycleDistribution(parsed.data);

    const deps = await createEfcTrainingDeps();
    const result = await deps.macrocycles.update(
      macrocycleId,
      membership.tenantId,
      parsed.data,
    );

    return { success: true, id: result.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al actualizar.";
    return { success: false, error: message };
  }
}
