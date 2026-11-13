import type {
  EfcAthleteProfile,
  EfcAthleteTest,
  EfcOneRmRecord,
  EfcWeightControl,
} from "@/domain/efc-training";

// ─── Athlete profile port ─────────────────────────────────────────────────────

export interface UpsertAthleteProfileInput
  extends Omit<EfcAthleteProfile, "id" | "createdAt" | "updatedAt"> {}

export interface SaveAthleteTestInput
  extends Omit<EfcAthleteTest, "id" | "createdAt"> {}

export interface AthleteProfileRepositoryPort {
  findByAthleteId(athleteId: string, tenantId: string): Promise<EfcAthleteProfile | null>;
  upsert(input: UpsertAthleteProfileInput): Promise<EfcAthleteProfile>;
  findTestsByAthleteId(
    athleteId: string,
    tenantId: string,
    limit?: number,
  ): Promise<EfcAthleteTest[]>;
  saveTest(input: SaveAthleteTestInput): Promise<EfcAthleteTest>;
  findLatestTestByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcAthleteTest | null>;
}

// ─── 1RM port ─────────────────────────────────────────────────────────────────

export interface SaveOneRmInput
  extends Omit<EfcOneRmRecord, "id" | "createdAt"> {}

export interface OneRmRepositoryPort {
  findByAthleteId(athleteId: string, tenantId: string): Promise<EfcOneRmRecord[]>;
  findByAthleteAndExercise(
    athleteId: string,
    tenantId: string,
    exercise: string,
  ): Promise<EfcOneRmRecord[]>;
  findLatestByAthleteAndExercise(
    athleteId: string,
    tenantId: string,
    exercise: string,
  ): Promise<EfcOneRmRecord | null>;
  save(input: SaveOneRmInput): Promise<EfcOneRmRecord>;
  delete(id: string, tenantId: string): Promise<void>;
}

// ─── Weight control port ──────────────────────────────────────────────────────

export interface SaveWeightControlInput
  extends Omit<EfcWeightControl, "id" | "createdAt"> {}

export interface WeightControlRepositoryPort {
  findByAthleteId(
    athleteId: string,
    tenantId: string,
    limit?: number,
  ): Promise<EfcWeightControl[]>;
  /** Returns the first record of the current control period (earliest date). */
  findBaselineByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcWeightControl | null>;
  save(input: SaveWeightControlInput): Promise<EfcWeightControl>;
  delete(id: string, tenantId: string): Promise<void>;
}
