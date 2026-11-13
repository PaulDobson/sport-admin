import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  EfcAthleteProfile,
  EfcAthleteTest,
  EfcOneRmRecord,
  EfcWeightControl,
} from "@/domain/efc-training";
import type {
  AthleteProfileRepositoryPort,
  OneRmRepositoryPort,
  WeightControlRepositoryPort,
  UpsertAthleteProfileInput,
  SaveAthleteTestInput,
  SaveOneRmInput,
  SaveWeightControlInput,
} from "@/application/efc-training/ports";

// ─── Row types ────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  athlete_id: string;
  tenant_id: string;
  fc_rest: number | null;
  is_smoker: boolean;
  efc_period: string;
  created_at: string;
  updated_at: string;
}

interface TestRow {
  id: string;
  athlete_id: string;
  tenant_id: string;
  evaluation_date: string;
  abs_1min: number | null;
  seat_and_reach_cm: number | null;
  pull_ups: number | null;
  push_ups_1min: number | null;
  sprint_10x5_sec: number | null;
  waist_cm: number | null;
  endurance_meters: number | null;
  created_at: string;
}

interface OneRmRow {
  id: string;
  athlete_id: string;
  tenant_id: string;
  exercise: string;
  evaluation_date: string;
  weight_kg: number;
  reps_performed: number;
  rir: number;
  one_rm_epley: number;
  one_rm_brzycki: number;
  one_rm_average: number;
  created_at: string;
}

interface WeightRow {
  id: string;
  athlete_id: string;
  tenant_id: string;
  record_date: string;
  weight_kg: number;
  category_name: string;
  category_limit_kg: number;
  created_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toProfile(r: ProfileRow): EfcAthleteProfile {
  return {
    id: r.id,
    athleteId: r.athlete_id,
    tenantId: r.tenant_id,
    fcRest: r.fc_rest,
    isSmoker: r.is_smoker,
    efcPeriod: r.efc_period as EfcAthleteProfile["efcPeriod"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toTest(r: TestRow): EfcAthleteTest {
  return {
    id: r.id,
    athleteId: r.athlete_id,
    tenantId: r.tenant_id,
    evaluationDate: r.evaluation_date,
    abs1min: r.abs_1min,
    seatAndReachCm: r.seat_and_reach_cm,
    pullUps: r.pull_ups,
    pushUps1min: r.push_ups_1min,
    sprint10x5Sec: r.sprint_10x5_sec,
    waistCm: r.waist_cm,
    enduranceMeters: r.endurance_meters,
    createdAt: r.created_at,
  };
}

function toOneRm(r: OneRmRow): EfcOneRmRecord {
  return {
    id: r.id,
    athleteId: r.athlete_id,
    tenantId: r.tenant_id,
    exercise: r.exercise,
    evaluationDate: r.evaluation_date,
    weightKg: Number(r.weight_kg),
    repsPerformed: r.reps_performed,
    rir: r.rir,
    oneRmEpley: Number(r.one_rm_epley),
    oneRmBrzycki: Number(r.one_rm_brzycki),
    oneRmAverage: Number(r.one_rm_average),
    createdAt: r.created_at,
  };
}

function toWeight(r: WeightRow): EfcWeightControl {
  return {
    id: r.id,
    athleteId: r.athlete_id,
    tenantId: r.tenant_id,
    recordDate: r.record_date,
    weightKg: Number(r.weight_kg),
    categoryName: r.category_name,
    categoryLimitKg: Number(r.category_limit_kg),
    createdAt: r.created_at,
  };
}

// ─── Athlete profile repo ─────────────────────────────────────────────────────

export class SupabaseAthleteProfileRepository implements AthleteProfileRepositoryPort {
  constructor(private readonly db: SupabaseDatabaseClient) {}

  async findByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcAthleteProfile | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.db as any)
      .from("efc_athlete_profile")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data ? toProfile(data as ProfileRow) : null;
  }

  async upsert(input: UpsertAthleteProfileInput): Promise<EfcAthleteProfile> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.db as any)
      .from("efc_athlete_profile")
      .upsert(
        {
          athlete_id: input.athleteId,
          tenant_id: input.tenantId,
          fc_rest: input.fcRest,
          is_smoker: input.isSmoker,
          efc_period: input.efcPeriod,
        },
        { onConflict: "athlete_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toProfile(data as ProfileRow);
  }

  async findTestsByAthleteId(
    athleteId: string,
    tenantId: string,
    limit = 50,
  ): Promise<EfcAthleteTest[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.db as any)
      .from("efc_athlete_tests")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .order("evaluation_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as TestRow[]) ?? []).map(toTest);
  }

  async saveTest(input: SaveAthleteTestInput): Promise<EfcAthleteTest> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.db as any)
      .from("efc_athlete_tests")
      .insert({
        athlete_id: input.athleteId,
        tenant_id: input.tenantId,
        evaluation_date: input.evaluationDate,
        abs_1min: input.abs1min,
        seat_and_reach_cm: input.seatAndReachCm,
        pull_ups: input.pullUps,
        push_ups_1min: input.pushUps1min,
        sprint_10x5_sec: input.sprint10x5Sec,
        waist_cm: input.waistCm,
        endurance_meters: input.enduranceMeters,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toTest(data as TestRow);
  }

  async findLatestTestByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcAthleteTest | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.db as any)
      .from("efc_athlete_tests")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .order("evaluation_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toTest(data as TestRow) : null;
  }
}

// ─── 1RM repo ─────────────────────────────────────────────────────────────────

export class SupabaseOneRmRepository implements OneRmRepositoryPort {
  constructor(private readonly db: SupabaseDatabaseClient) {}

  async findByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcOneRmRecord[]> {
    const { data, error } = await (this.db as any)
      .from("efc_1rm_records")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .order("evaluation_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toOneRm);
  }

  async findByAthleteAndExercise(
    athleteId: string,
    tenantId: string,
    exercise: string,
  ): Promise<EfcOneRmRecord[]> {
    const { data, error } = await (this.db as any)
      .from("efc_1rm_records")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .eq("exercise", exercise)
      .order("evaluation_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toOneRm);
  }

  async findLatestByAthleteAndExercise(
    athleteId: string,
    tenantId: string,
    exercise: string,
  ): Promise<EfcOneRmRecord | null> {
    const { data, error } = await (this.db as any)
      .from("efc_1rm_records")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .eq("exercise", exercise)
      .order("evaluation_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toOneRm(data) : null;
  }

  async save(input: SaveOneRmInput): Promise<EfcOneRmRecord> {
    const { data, error } = await (this.db as any)
      .from("efc_1rm_records")
      .insert({
        athlete_id: input.athleteId,
        tenant_id: input.tenantId,
        exercise: input.exercise,
        evaluation_date: input.evaluationDate,
        weight_kg: input.weightKg,
        reps_performed: input.repsPerformed,
        rir: input.rir,
        one_rm_epley: input.oneRmEpley,
        one_rm_brzycki: input.oneRmBrzycki,
        one_rm_average: input.oneRmAverage,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toOneRm(data);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await (this.db as any)
      .from("efc_1rm_records")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) throw error;
  }
}

// ─── Weight control repo ──────────────────────────────────────────────────────

export class SupabaseWeightControlRepository implements WeightControlRepositoryPort {
  constructor(private readonly db: SupabaseDatabaseClient) {}

  async findByAthleteId(
    athleteId: string,
    tenantId: string,
    limit = 90,
  ): Promise<EfcWeightControl[]> {
    const { data, error } = await (this.db as any)
      .from("efc_weight_control")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .order("record_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toWeight);
  }

  async findBaselineByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcWeightControl | null> {
    const { data, error } = await (this.db as any)
      .from("efc_weight_control")
      .select("*")
      .eq("athlete_id", athleteId)
      .eq("tenant_id", tenantId)
      .order("record_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toWeight(data) : null;
  }

  async save(input: SaveWeightControlInput): Promise<EfcWeightControl> {
    const { data, error } = await (this.db as any)
      .from("efc_weight_control")
      .upsert(
        {
          athlete_id: input.athleteId,
          tenant_id: input.tenantId,
          record_date: input.recordDate,
          weight_kg: input.weightKg,
          category_name: input.categoryName,
          category_limit_kg: input.categoryLimitKg,
        },
        { onConflict: "athlete_id,record_date" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toWeight(data);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await (this.db as any)
      .from("efc_weight_control")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) throw error;
  }
}
