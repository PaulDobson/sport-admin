/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Supabase repository for efc_macrocycles.
 * Uses `(this.db as any)` for EFC tables until migrations are applied and
 * database.types.ts is regenerated via `supabase gen types typescript`.
 */
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { EfcMacrocycle } from "@/domain/efc-training";
import type {
  MacrocycleRepositoryPort,
  SaveMacrocycleInput,
  UpdateMacrocycleInput,
} from "@/application/efc-training/ports";

interface MacrocycleRow {
  id: string;
  athlete_id: string;
  tenant_id: string;
  start_date: string;
  competition_date: string;
  hours_per_session: number;
  training_days_per_week: number;
  sessions_per_day: number;
  e_percentage: number;
  f_percentage: number;
  c_percentage: number;
  justification: string | null;
  created_at: string;
  updated_at: string;
}

function toMacrocycle(r: MacrocycleRow): EfcMacrocycle {
  return {
    id: r.id,
    athleteId: r.athlete_id,
    tenantId: r.tenant_id,
    startDate: r.start_date,
    competitionDate: r.competition_date,
    hoursPerSession: Number(r.hours_per_session),
    trainingDaysPerWeek: r.training_days_per_week,
    sessionsPerDay: r.sessions_per_day,
    ePercentage: r.e_percentage,
    fPercentage: r.f_percentage,
    cPercentage: r.c_percentage,
    justification: r.justification,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class SupabaseMacrocycleRepository implements MacrocycleRepositoryPort {
  private get q() {
    return (this.db as any).from("efc_macrocycles");
  }
  constructor(private readonly db: SupabaseDatabaseClient) {}

  async findById(id: string, tenantId: string): Promise<EfcMacrocycle | null> {
    const { data, error } = await this.q
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data ? toMacrocycle(data as MacrocycleRow) : null;
  }

  async findByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcMacrocycle[]> {
    const { data, error } = await this.q
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return ((data as MacrocycleRow[]) ?? []).map(toMacrocycle);
  }

  async findActiveByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcMacrocycle | null> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.q
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .lte("start_date", today)
      .gt("competition_date", today)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toMacrocycle(data as MacrocycleRow) : null;
  }

  async save(input: SaveMacrocycleInput): Promise<EfcMacrocycle> {
    const { data, error } = await this.q
      .insert({
        athlete_id: input.athleteId,
        tenant_id: input.tenantId,
        start_date: input.startDate,
        competition_date: input.competitionDate,
        hours_per_session: input.hoursPerSession,
        training_days_per_week: input.trainingDaysPerWeek,
        sessions_per_day: input.sessionsPerDay,
        e_percentage: input.ePercentage,
        f_percentage: input.fPercentage,
        c_percentage: input.cPercentage,
        justification: input.justification,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toMacrocycle(data as MacrocycleRow);
  }

  async update(
    id: string,
    tenantId: string,
    input: UpdateMacrocycleInput,
  ): Promise<EfcMacrocycle> {
    const patch: Record<string, unknown> = {};
    if (input.startDate !== undefined) patch.start_date = input.startDate;
    if (input.competitionDate !== undefined)
      patch.competition_date = input.competitionDate;
    if (input.hoursPerSession !== undefined)
      patch.hours_per_session = input.hoursPerSession;
    if (input.trainingDaysPerWeek !== undefined)
      patch.training_days_per_week = input.trainingDaysPerWeek;
    if (input.sessionsPerDay !== undefined)
      patch.sessions_per_day = input.sessionsPerDay;
    if (input.ePercentage !== undefined) patch.e_percentage = input.ePercentage;
    if (input.fPercentage !== undefined) patch.f_percentage = input.fPercentage;
    if (input.cPercentage !== undefined) patch.c_percentage = input.cPercentage;
    if (input.justification !== undefined)
      patch.justification = input.justification;
    const { data, error } = await this.q
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();
    if (error) throw error;
    return toMacrocycle(data as MacrocycleRow);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.q
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) throw error;
  }
}
