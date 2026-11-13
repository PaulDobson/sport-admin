/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  EfcMicrocycle,
  SessionLoad,
  SessionSrpe,
} from "@/domain/efc-training";
import type {
  MicrocycleRepositoryPort,
  SaveMicrocycleInput,
  UpdateMicrocycleInput,
  SaveSrpeInput,
} from "@/application/efc-training/ports";

interface MicrocycleRow {
  id: string;
  macrocycle_id: string;
  week_number: number;
  microcycle_type: string;
  intensity_target: number;
  objective: string;
  created_at: string;
  updated_at: string;
}
interface LoadRow {
  id: string;
  microcycle_id: string;
  tenant_id: string;
  day_of_week: number;
  category: string;
  subcategory: string;
  minutes: number;
  notes: string | null;
  created_at: string;
}
interface SrpeRow {
  id: string;
  microcycle_id: string;
  athlete_id: string;
  tenant_id: string;
  day_of_week: number;
  rpe: number;
  duration_minutes: number;
  srpe: number;
  created_at: string;
}

function toMicrocycle(r: MicrocycleRow): EfcMicrocycle {
  return {
    id: r.id,
    macrocycleId: r.macrocycle_id,
    weekNumber: r.week_number,
    microcycleType: r.microcycle_type as EfcMicrocycle["microcycleType"],
    intensityTarget: r.intensity_target as EfcMicrocycle["intensityTarget"],
    objective: r.objective,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function toLoad(r: LoadRow): SessionLoad {
  return {
    id: r.id,
    microcycleId: r.microcycle_id,
    tenantId: r.tenant_id,
    dayOfWeek: r.day_of_week,
    category: r.category,
    subcategory: r.subcategory,
    minutes: r.minutes,
    notes: r.notes,
    createdAt: r.created_at,
  };
}
function toSrpe(r: SrpeRow): SessionSrpe {
  return {
    id: r.id,
    microcycleId: r.microcycle_id,
    athleteId: r.athlete_id,
    tenantId: r.tenant_id,
    dayOfWeek: r.day_of_week,
    rpe: r.rpe,
    durationMinutes: r.duration_minutes,
    srpe: r.srpe,
    createdAt: r.created_at,
  };
}

export class SupabaseMicrocycleRepository implements MicrocycleRepositoryPort {
  private table(name: string) {
    return (this.db as any).from(name);
  }
  constructor(private readonly db: SupabaseDatabaseClient) {}

  async findById(id: string): Promise<EfcMicrocycle | null> {
    const { data, error } = await this.table("efc_microcycles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toMicrocycle(data as MicrocycleRow) : null;
  }

  async findByMacrocycleId(macrocycleId: string): Promise<EfcMicrocycle[]> {
    const { data, error } = await this.table("efc_microcycles")
      .select("*")
      .eq("macrocycle_id", macrocycleId)
      .order("week_number");
    if (error) throw error;
    return ((data as MicrocycleRow[]) ?? []).map(toMicrocycle);
  }

  async findByWeekNumber(
    macrocycleId: string,
    weekNumber: number,
  ): Promise<EfcMicrocycle | null> {
    const { data, error } = await this.table("efc_microcycles")
      .select("*")
      .eq("macrocycle_id", macrocycleId)
      .eq("week_number", weekNumber)
      .maybeSingle();
    if (error) throw error;
    return data ? toMicrocycle(data as MicrocycleRow) : null;
  }

  async save(input: SaveMicrocycleInput): Promise<EfcMicrocycle> {
    const { data, error } = await this.table("efc_microcycles")
      .insert({
        macrocycle_id: input.macrocycleId,
        week_number: input.weekNumber,
        microcycle_type: input.microcycleType,
        intensity_target: input.intensityTarget,
        objective: input.objective,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toMicrocycle(data as MicrocycleRow);
  }

  async update(
    id: string,
    input: UpdateMicrocycleInput,
  ): Promise<EfcMicrocycle> {
    const patch: Record<string, unknown> = {};
    if (input.microcycleType !== undefined)
      patch.microcycle_type = input.microcycleType;
    if (input.intensityTarget !== undefined)
      patch.intensity_target = input.intensityTarget;
    if (input.objective !== undefined) patch.objective = input.objective;
    const { data, error } = await this.table("efc_microcycles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toMicrocycle(data as MicrocycleRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.table("efc_microcycles").delete().eq("id", id);
    if (error) throw error;
  }

  async findLoadsByMicrocycleId(microcycleId: string): Promise<SessionLoad[]> {
    const { data, error } = await this.table("efc_session_loads")
      .select("*")
      .eq("microcycle_id", microcycleId)
      .order("day_of_week")
      .order("category");
    if (error) throw error;
    return ((data as LoadRow[]) ?? []).map(toLoad);
  }

  async replaceLoads(
    microcycleId: string,
    tenantId: string,
    loads: Array<Omit<SessionLoad, "id" | "createdAt">>,
  ): Promise<SessionLoad[]> {
    const { error: delError } = await this.table("efc_session_loads")
      .delete()
      .eq("microcycle_id", microcycleId);
    if (delError) throw delError;
    if (loads.length === 0) return [];
    const { data, error } = await this.table("efc_session_loads")
      .insert(
        loads.map((l) => ({
          microcycle_id: l.microcycleId,
          tenant_id: l.tenantId,
          day_of_week: l.dayOfWeek,
          category: l.category,
          subcategory: l.subcategory,
          minutes: l.minutes,
          notes: l.notes,
        })),
      )
      .select("*");
    if (error) throw error;
    return ((data as LoadRow[]) ?? []).map(toLoad);
  }

  async findSrpeByMicrocycleAndAthlete(
    microcycleId: string,
    athleteId: string,
  ): Promise<SessionSrpe[]> {
    const { data, error } = await this.table("efc_session_srpe")
      .select("*")
      .eq("microcycle_id", microcycleId)
      .eq("athlete_id", athleteId);
    if (error) throw error;
    return ((data as SrpeRow[]) ?? []).map(toSrpe);
  }

  async upsertSrpe(input: SaveSrpeInput): Promise<SessionSrpe> {
    const { data, error } = await this.table("efc_session_srpe")
      .upsert(
        {
          microcycle_id: input.microcycleId,
          athlete_id: input.athleteId,
          tenant_id: input.tenantId,
          day_of_week: input.dayOfWeek,
          rpe: input.rpe,
          duration_minutes: input.durationMinutes,
        },
        { onConflict: "microcycle_id,athlete_id,day_of_week" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toSrpe(data as SrpeRow);
  }

  async findRecentSrpeByAthlete(
    athleteId: string,
    tenantId: string,
    days: number,
  ): Promise<Array<{ date: string; srpe: number }>> {
    // Fetch sRPE joined with microcycle (for week_number) and macrocycle (for start_date)
    // to reconstruct the actual calendar date of each session.
    const { data, error } = await (this.db as any)
      .from("efc_session_srpe")
      .select(
        `srpe, day_of_week, efc_microcycles!inner(week_number, efc_macrocycles!inner(start_date))`,
      )
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId);

    if (error) throw error;
    if (!data) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const results: Array<{ date: string; srpe: number }> = [];
    for (const row of data as any[]) {
      const mc = row.efc_microcycles;
      if (!mc) continue;
      const mac = mc.efc_macrocycles;
      if (!mac) continue;
      const startDate = new Date(mac.start_date);
      // week_number is 1-based, day_of_week is 1=Mon..7=Sun
      const dayOffset = (mc.week_number - 1) * 7 + (row.day_of_week - 1);
      const entryDate = new Date(startDate);
      entryDate.setDate(entryDate.getDate() + dayOffset);
      const dateStr = entryDate.toISOString().slice(0, 10);
      if (dateStr >= cutoffStr) {
        results.push({ date: dateStr, srpe: row.srpe });
      }
    }
    return results;
  }
}
