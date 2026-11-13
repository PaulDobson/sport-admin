import type {
  EfcMacrocycle,
  EfcMicrocycle,
  SessionLoad,
  SessionSrpe,
} from "@/domain/efc-training";

// ─── Macrocycle inputs ────────────────────────────────────────────────────────

export interface SaveMacrocycleInput extends Omit<
  EfcMacrocycle,
  "id" | "createdAt" | "updatedAt"
> {}

export interface UpdateMacrocycleInput extends Partial<
  Omit<
    EfcMacrocycle,
    "id" | "athleteId" | "tenantId" | "createdAt" | "updatedAt"
  >
> {}

// ─── Port ─────────────────────────────────────────────────────────────────────

export interface MacrocycleRepositoryPort {
  findById(id: string, tenantId: string): Promise<EfcMacrocycle | null>;
  findByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcMacrocycle[]>;
  /** Returns the macrocycle whose date range includes today, or null. */
  findActiveByAthleteId(
    athleteId: string,
    tenantId: string,
  ): Promise<EfcMacrocycle | null>;
  save(input: SaveMacrocycleInput): Promise<EfcMacrocycle>;
  update(
    id: string,
    tenantId: string,
    data: UpdateMacrocycleInput,
  ): Promise<EfcMacrocycle>;
  delete(id: string, tenantId: string): Promise<void>;
}

// ─── Microcycle inputs ────────────────────────────────────────────────────────

export interface SaveMicrocycleInput extends Omit<
  EfcMicrocycle,
  "id" | "createdAt" | "updatedAt"
> {}

export interface UpdateMicrocycleInput extends Partial<
  Omit<EfcMicrocycle, "id" | "macrocycleId" | "createdAt" | "updatedAt">
> {}

export interface SaveSrpeInput extends Omit<
  SessionSrpe,
  "id" | "srpe" | "createdAt"
> {}

// ─── Microcycle port ──────────────────────────────────────────────────────────

export interface MicrocycleRepositoryPort {
  findById(id: string): Promise<EfcMicrocycle | null>;
  findByMacrocycleId(macrocycleId: string): Promise<EfcMicrocycle[]>;
  findByWeekNumber(
    macrocycleId: string,
    weekNumber: number,
  ): Promise<EfcMicrocycle | null>;
  save(input: SaveMicrocycleInput): Promise<EfcMicrocycle>;
  update(id: string, data: UpdateMicrocycleInput): Promise<EfcMicrocycle>;
  delete(id: string): Promise<void>;
  /** Returns all session load entries for a microcycle. */
  findLoadsByMicrocycleId(microcycleId: string): Promise<SessionLoad[]>;
  /** Replaces all session loads for a microcycle atomically. */
  replaceLoads(
    microcycleId: string,
    tenantId: string,
    loads: Array<Omit<SessionLoad, "id" | "createdAt">>,
  ): Promise<SessionLoad[]>;
  findSrpeByMicrocycleAndAthlete(
    microcycleId: string,
    athleteId: string,
  ): Promise<SessionSrpe[]>;
  upsertSrpe(input: SaveSrpeInput): Promise<SessionSrpe>;
  /** Returns all sRPE records for an athlete in the last N days (for ACWR). */
  findRecentSrpeByAthlete(
    athleteId: string,
    tenantId: string,
    days: number,
  ): Promise<Array<{ date: string; srpe: number }>>;
}
