/**
 * Server Actions for cognitive exercise configuration persistence.
 *
 * Follows the same pattern as gym/actions.ts:
 * - loadOperationalContext() for auth + tenant resolution
 * - Supabase browser-free (server client)
 * - Returns typed state objects compatible with useActionState
 */

"use server";

import { revalidatePath } from "next/cache";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import type {
  CognitiveExerciseConfig,
  CognitiveExercise,
} from "@/domain/cognitive-training/cognitive-exercise";

// ─── State types ──────────────────────────────────────────────────────────────

export interface SaveExerciseState {
  error: string | null;
  saved: boolean;
  exercise?: CognitiveExercise;
}

export interface DeleteExerciseState {
  error: string | null;
  deleted: boolean;
}

export interface ListExercisesState {
  exercises: CognitiveExercise[];
  error: string | null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateConfig(config: CognitiveExerciseConfig): string | null {
  if (!config.name?.trim()) return "El ejercicio necesita un nombre.";
  if (config.name.trim().length > 80)
    return "El nombre no puede superar los 80 caracteres.";
  const { seriesConfig } = config;
  if (seriesConfig.totalSeries < 1 || seriesConfig.totalSeries > 20) {
    return "El número de series debe estar entre 1 y 20.";
  }
  const workSecs = seriesConfig.workMinutes * 60 + seriesConfig.workSeconds;
  if (workSecs < 5)
    return "El tiempo de trabajo debe ser de al menos 5 segundos.";
  if (workSecs > 3600)
    return "El tiempo de trabajo no puede superar 60 minutos.";
  if (config.stimulusTiming.displayDurationMs < 100) {
    return "La duración del estímulo debe ser al menos 100 ms.";
  }
  if (config.stimulusTiming.displayDurationMs > 30000) {
    return "La duración del estímulo no puede superar 30 segundos.";
  }
  if (config.stimulusTiming.gapDurationMs < 0) {
    return "El intervalo entre estímulos no puede ser negativo.";
  }
  if (config.selectedStimulusIds.length === 0) {
    return "Debes seleccionar al menos un estímulo visual.";
  }
  return null;
}

// ─── Save (create or update) ──────────────────────────────────────────────────

export async function saveExerciseAction(
  id: string | null,
  config: CognitiveExerciseConfig,
): Promise<SaveExerciseState> {
  try {
    const context = await loadOperationalContext();
    if (context.status !== "ready") {
      return {
        error: "Tu sesión ya no está disponible. Recarga la página.",
        saved: false,
      };
    }

    const validationError = validateConfig(config);
    if (validationError) {
      return { error: validationError, saved: false };
    }

    const client = await createSupabaseServerClient();
    const tenantId = context.membership.tenantId;

    let result: CognitiveExercise;

    if (id) {
      // Update existing
      const { data, error } = await client
        .from("cognitive_exercise_configs")
        .update({
          config:
            config as unknown as import("@/infrastructure/supabase/database.types").Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error || !data) {
        console.error("Failed to update cognitive exercise", error);
        return { error: "No se pudo actualizar el ejercicio.", saved: false };
      }

      result = {
        id: data.id,
        tenantId: data.tenant_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        config: data.config as unknown as CognitiveExerciseConfig,
      };
    } else {
      // Create new
      const { data, error } = await client
        .from("cognitive_exercise_configs")
        .insert({
          tenant_id: tenantId,
          config:
            config as unknown as import("@/infrastructure/supabase/database.types").Json,
        })
        .select()
        .single();

      if (error || !data) {
        console.error("Failed to create cognitive exercise", error);
        return { error: "No se pudo guardar el ejercicio.", saved: false };
      }

      result = {
        id: data.id,
        tenantId: data.tenant_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        config: data.config as unknown as CognitiveExerciseConfig,
      };
    }

    revalidatePath("/dashboard/trainings/cognitive");
    return { error: null, saved: true, exercise: result };
  } catch (error) {
    console.error("saveExerciseAction unexpected error", error);
    return {
      error: "Ocurrió un error inesperado. Inténtalo de nuevo.",
      saved: false,
    };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteExerciseAction(
  id: string,
): Promise<DeleteExerciseState> {
  try {
    const context = await loadOperationalContext();
    if (context.status !== "ready") {
      return { error: "Tu sesión ya no está disponible.", deleted: false };
    }

    const client = await createSupabaseServerClient();
    const { error } = await client
      .from("cognitive_exercise_configs")
      .delete()
      .eq("id", id)
      .eq("tenant_id", context.membership.tenantId);

    if (error) {
      console.error("Failed to delete cognitive exercise", error);
      return { error: "No se pudo eliminar el ejercicio.", deleted: false };
    }

    revalidatePath("/dashboard/trainings/cognitive");
    return { error: null, deleted: true };
  } catch (error) {
    console.error("deleteExerciseAction unexpected error", error);
    return { error: "Ocurrió un error inesperado.", deleted: false };
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listExercisesAction(): Promise<ListExercisesState> {
  try {
    const context = await loadOperationalContext();
    if (context.status !== "ready") {
      return { exercises: [], error: "No se pudo verificar la sesión." };
    }

    const client = await createSupabaseServerClient();
    const { data, error } = await client
      .from("cognitive_exercise_configs")
      .select("*")
      .eq("tenant_id", context.membership.tenantId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to list cognitive exercises", error);
      return { exercises: [], error: "No se pudieron cargar los ejercicios." };
    }

    const exercises: CognitiveExercise[] = (data ?? []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      config: row.config as unknown as CognitiveExerciseConfig,
    }));

    return { exercises, error: null };
  } catch (error) {
    console.error("listExercisesAction unexpected error", error);
    return { exercises: [], error: "Ocurrió un error inesperado." };
  }
}
