import { Suspense } from "react";
import {
  Dumbbell,
  TrendingUp,
  Calendar,
  Scale,
  BookOpen,
  BarChart2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { computeAcwr } from "@/domain/efc-training";
import { EfcDashboardClient } from "./_components/efc-dashboard-client";
import { EfcAthleteSelector } from "./_components/efc-athlete-selector";

/** EFC Dashboard — entry point. Requires a selected athlete to show the full summary. */
export default async function EfcPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string }>;
}) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const athleteId = params.athleteId ?? null;

  const [ops, efc] = await Promise.all([
    createInstructorOperationsDeps(),
    createEfcTrainingDeps(),
  ]);

  // Fetch athlete list for selector
  const athletes = await ops.students.findActiveByTenant(membership.tenantId);

  // If athlete selected, fetch their active macrocycle, profile, and ACWR data
  const [macrocycle, profile] = athleteId
    ? await Promise.all([
        efc.macrocycles.findActiveByAthleteId(athleteId, membership.tenantId),
        efc.profiles.findByAthleteId(athleteId, membership.tenantId),
      ])
    : [null, null];

  // Fetch sRPE for ACWR calculation (last 28 days)
  const acwrResult =
    athleteId && macrocycle
      ? computeAcwr(
          await efc.microcycles.findRecentSrpeByAthlete(
            athleteId,
            membership.tenantId,
            28,
          ),
        )
      : null;

  // Fetch most recent microcycle week number to detect 14-day inactivity
  const lastMicrocycleWeek: number | null =
    athleteId && macrocycle
      ? ((await efc.microcycles.findByMacrocycleId(macrocycle.id)).at(-1)
          ?.weekNumber ?? null)
      : null;

  return (
    <div className="space-y-8 pb-4 pt-2">
      {/* ── Back to trainings ────────────────────────────────────────────── */}
      <div className="px-1">
        <Link
          href="/dashboard/trainings"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Entrenamientos
        </Link>
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="space-y-1 px-1">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
          <TrendingUp aria-hidden="true" className="h-4 w-4" />
          Método EFC
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Planificación EFC
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Estructura · Función · Cognición — planificación periodizada para
          taekwondo de combate.
        </p>
      </header>

      {/* ── Quick-access nav ─────────────────────────────────────────────── */}
      <nav
        aria-label="Módulos EFC"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {[
          { href: "efc/macrocycle", label: "Macrociclo", icon: Calendar },
          { href: "efc/microcycle", label: "Microciclos", icon: BarChart2 },
          { href: "efc/one-rm", label: "Calculadora 1RM", icon: Dumbbell },
          { href: "efc/load-charts", label: "Ondulación", icon: TrendingUp },
          { href: "efc/library", label: "Biblioteca EFC", icon: BookOpen },
          { href: "efc/weight-control", label: "Control de Peso", icon: Scale },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={`/dashboard/trainings/${href}${athleteId ? `?athleteId=${athleteId}` : ""}`}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center text-xs font-semibold transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Icon className="h-5 w-5 text-amber-400" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      {/* ── Athlete selector (shows when no athlete is picked) ───────────── */}
      {!athleteId ? (
        <EfcAthleteSelector athletes={athletes} />
      ) : (
        <Suspense
          fallback={<div className="h-32 animate-pulse rounded-xl bg-card" />}
        >
          <EfcDashboardClient
            athleteId={athleteId}
            tenantId={membership.tenantId}
            macrocycle={macrocycle}
            profile={profile}
            athletes={athletes}
            acwrResult={acwrResult}
            lastMicrocycleWeek={lastMicrocycleWeek}
          />
        </Suspense>
      )}
    </div>
  );
}
