"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Dumbbell,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  EfcMacrocycle,
  EfcAthleteProfile,
  AcwrResult,
} from "@/domain/efc-training";
import type { Student } from "@/domain/instructor-operations/student";
import {
  EFC_PERIOD_LABELS,
  EFC_PERIOD_COLORS,
  ACWR_ZONE_CONFIG,
} from "@/domain/efc-training";

interface Props {
  athleteId: string;
  tenantId: string;
  macrocycle: EfcMacrocycle | null;
  profile: EfcAthleteProfile | null;
  athletes: Student[];
  acwrResult: AcwrResult | null;
  lastMicrocycleWeek: number | null;
}

/** ACWR zone styling — colours match the 4-level semaphore from req 2.10 */
const ACWR_STYLES = {
  undertrained: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  optimal: {
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  caution: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  danger: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },
} as const;

/** Period badge colour */
const PERIOD_BADGE = {
  E: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  F: "bg-green-500/15 text-green-400 border-green-500/30",
  C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
} as const;

function weeksRemaining(competitionDate: string): number {
  const today = new Date();
  const comp = new Date(competitionDate);
  const diff = comp.getTime() - today.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)));
}

function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function EfcDashboardClient({
  athleteId,
  tenantId,
  macrocycle,
  profile,
  athletes,
  acwrResult,
  lastMicrocycleWeek,
}: Props) {
  const period = profile?.efcPeriod ?? "E";
  const periodLabel = EFC_PERIOD_LABELS[period];
  const badgeClass = PERIOD_BADGE[period];

  return (
    <div className="space-y-5">
      {/* ── Athlete picker (inline switcher) ──────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden="true" />
          Deportista:
        </span>
        <select
          defaultValue={athleteId}
          onChange={(e) => {
            if (e.target.value)
              window.location.href = `/dashboard/trainings/efc?athleteId=${e.target.value}`;
          }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Cambiar deportista"
        >
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName}
            </option>
          ))}
        </select>
        {/* Period badge */}
        <span
          className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${badgeClass}`}
        >
          Período {period} — {periodLabel}
        </span>
      </div>

      {/* ── No macrocycle CTA ──────────────────────────────────────────── */}
      {!macrocycle ? (
        <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-10 text-center">
          <Calendar
            className="h-10 w-10 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold">Sin macrociclo activo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea un macrociclo EFC para comenzar la planificación de este
              deportista.
            </p>
          </div>
          <Link
            href={`/dashboard/trainings/efc/macrocycle?athleteId=${athleteId}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Crear macrociclo
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Macrocycle summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Macrociclo activo
            </p>
            <p className="mt-2 text-sm font-medium">
              {new Date(macrocycle.startDate).toLocaleDateString("es-CL")}
              {" → "}
              {new Date(macrocycle.competitionDate).toLocaleDateString("es-CL")}
            </p>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {weeksRemaining(macrocycle.competitionDate)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                sem. restantes
              </span>
            </p>
            {weeksRemaining(macrocycle.competitionDate) === 0 && (
              <p className="mt-1 text-xs font-medium text-amber-400">
                🏆 Competencia alcanzada
              </p>
            )}
          </div>

          {/* EFC distribution */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Distribución planificada
            </p>
            <div className="mt-3 space-y-2">
              {(["E", "F", "C"] as const).map((p) => {
                const pct =
                  p === "E"
                    ? macrocycle.ePercentage
                    : p === "F"
                      ? macrocycle.fPercentage
                      : macrocycle.cPercentage;
                const totalMin = Math.round(
                  ((new Date(macrocycle.competitionDate).getTime() -
                    new Date(macrocycle.startDate).getTime()) /
                    (1000 * 60 * 60 * 24 * 7)) *
                    macrocycle.trainingDaysPerWeek *
                    macrocycle.sessionsPerDay *
                    macrocycle.hoursPerSession *
                    60,
                );
                const periodMin = Math.round((totalMin * pct) / 100);
                return (
                  <div key={p}>
                    <div className="flex justify-between text-xs">
                      <span
                        className={`font-medium ${PERIOD_BADGE[p].split(" ").find((c) => c.startsWith("text-"))}`}
                      >
                        {EFC_PERIOD_LABELS[p]} ({pct}%)
                      </span>
                      <span className="text-muted-foreground">
                        {formatHHMM(periodMin)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${p === "E" ? "bg-blue-400" : p === "F" ? "bg-green-400" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${EFC_PERIOD_LABELS[p]} ${pct}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Acceso rápido
            </p>
            <div className="mt-3 space-y-2">
              <Link
                href={`/dashboard/trainings/efc/one-rm?athleteId=${athleteId}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-surface-raised"
              >
                <Dumbbell
                  className="h-4 w-4 text-amber-400"
                  aria-hidden="true"
                />
                Calculadora 1RM
              </Link>
              <Link
                href={`/dashboard/trainings/efc/microcycle?athleteId=${athleteId}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-surface-raised"
              >
                <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Nuevo microciclo
              </Link>
              <Link
                href={`/dashboard/trainings/efc/load-charts?athleteId=${athleteId}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-surface-raised"
              >
                <TrendingUp
                  className="h-4 w-4 text-amber-400"
                  aria-hidden="true"
                />
                Ver ondulación de carga
              </Link>
              {macrocycle && (
                <a
                  href={`/api/efc/export-macrocycle?macrocycleId=${macrocycle.id}`}
                  download
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-surface-raised"
                  aria-label="Exportar macrociclo a Excel"
                >
                  <Download
                    className="h-4 w-4 text-amber-400"
                    aria-hidden="true"
                  />
                  Exportar macrociclo
                </a>
              )}
              <a
                href={`/api/efc/export-athlete?athleteId=${athleteId}`}
                download
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-surface-raised"
                aria-label="Exportar ficha EFC del deportista a Excel"
              >
                <Download
                  className="h-4 w-4 text-amber-400"
                  aria-hidden="true"
                />
                Exportar ficha EFC
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Inactivity alert ─────────────────────────────────────────────── */}
      {macrocycle && lastMicrocycleWeek === null && (
        <div
          className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300"
          role="alert"
        >
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-blue-400"
            aria-hidden="true"
          />
          Sin microciclos registrados. Crea el primer microciclo para comenzar
          el seguimiento de carga.
        </div>
      )}

      {/* ── ACWR widget ─────────────────────────────────────────────────── */}
      {acwrResult && acwrResult.daysOfData > 0 ? (
        <section
          className="rounded-xl border border-border bg-card p-5"
          aria-label="Ratio Agudo:Crónico (ACWR)"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            ACWR — Ratio Agudo:Crónico
          </p>
          <div className="flex flex-wrap items-start gap-6">
            <div>
              <p className="text-4xl font-bold tabular-nums">
                {acwrResult.acwr !== null ? acwrResult.acwr.toFixed(2) : "N/A"}
              </p>
              {acwrResult.zone && (
                <p className="mt-1 text-sm font-medium">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      acwrResult.zone === "optimal"
                        ? "bg-green-500/15 text-green-400"
                        : acwrResult.zone === "caution"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : acwrResult.zone === "danger"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {ACWR_ZONE_CONFIG[acwrResult.zone].label}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {ACWR_ZONE_CONFIG[acwrResult.zone].description}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Carga Aguda (CA, 7 días):{" "}
                <strong className="text-foreground">
                  {acwrResult.ca.toFixed(1)} UA/día
                </strong>
              </p>
              <p>
                Carga Crónica (CC, 28 días):{" "}
                <strong className="text-foreground">
                  {acwrResult.cc.toFixed(1)} UA/día
                </strong>
              </p>
              <p>{acwrResult.daysOfData} días de datos registrados</p>
              {acwrResult.insufficientData && (
                <p className="text-amber-400">
                  ⚠ Datos insuficientes para CC estable (&lt;28 días)
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <aside className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/80">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <span>
            El <strong>ACWR</strong> se calculará automáticamente al registrar
            los sRPE de cada sesión en el constructor de microciclos.
          </span>
        </aside>
      )}
    </div>
  );
}
