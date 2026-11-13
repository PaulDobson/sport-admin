import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import {
  computePhysiologicalMetrics,
} from "@/domain/efc-training";
import type { AthleteProfileRepositoryPort } from "../ports";

// ─── Schema ───────────────────────────────────────────────────────────────────

const upsertProfileSchema = z.object({
  athleteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fcRest: z.number().int().min(20).max(220).nullable().default(null),
  isSmoker: z.boolean().default(false),
  efcPeriod: z.enum(["E", "F", "C"]).default("E"),
});

export type UpsertEfcProfileInput = z.input<typeof upsertProfileSchema>;

const saveTestSchema = z.object({
  athleteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  evaluationDate: z.iso.date(),
  abs1min: z.number().int().min(0).max(300).nullable().default(null),
  seatAndReachCm: z.number().min(-30).max(50).nullable().default(null),
  pullUps: z.number().int().min(0).max(100).nullable().default(null),
  pushUps1min: z.number().int().min(0).max(300).nullable().default(null),
  sprint10x5Sec: z.number().min(0.1).max(120).nullable().default(null),
  waistCm: z.number().min(40).max(200).nullable().default(null),
  enduranceMeters: z.number().int().min(100).max(10000).nullable().default(null),
});

export type SaveAthleteTestInput = z.input<typeof saveTestSchema>;

// ─── Use cases ────────────────────────────────────────────────────────────────

export async function upsertEfcProfile(
  input: UpsertEfcProfileInput,
  deps: { profiles: AthleteProfileRepositoryPort },
) {
  return deps.profiles.upsert(parseWithSchema(upsertProfileSchema, input));
}

export async function getEfcProfileWithMetrics(
  athleteId: string,
  tenantId: string,
  athlete: {
    weightKg: number | null;
    heightCm: number | null;
    birthDate: string | null;
    gender: "male" | "female" | null;
  },
  deps: { profiles: AthleteProfileRepositoryPort },
) {
  const [profile, latestTest] = await Promise.all([
    deps.profiles.findByAthleteId(athleteId, tenantId),
    deps.profiles.findLatestTestByAthleteId(athleteId, tenantId),
  ]);

  const metrics = computePhysiologicalMetrics({
    weightKg: athlete.weightKg,
    heightCm: athlete.heightCm,
    birthDate: athlete.birthDate,
    gender: athlete.gender,
    fcRest: profile?.fcRest ?? null,
    cooperDistanceMeters: latestTest?.enduranceMeters ?? null,
  });

  return { profile, metrics };
}

export async function saveAthleteTest(
  input: SaveAthleteTestInput,
  deps: { profiles: AthleteProfileRepositoryPort },
) {
  return deps.profiles.saveTest(parseWithSchema(saveTestSchema, input));
}

export async function listAthleteTests(
  athleteId: string,
  tenantId: string,
  limit: number = 50,
  deps: { profiles: AthleteProfileRepositoryPort },
) {
  return deps.profiles.findTestsByAthleteId(athleteId, tenantId, limit);
}
