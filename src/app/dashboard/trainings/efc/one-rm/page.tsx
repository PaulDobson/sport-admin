import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { OneRmCalculatorClient } from "./one-rm-calculator-client";

/**
 * OneRmPage — Server Component
 *
 * Loads athlete profile and recent 1RM records (when an athleteId is present
 * in the URL), then hands everything to `OneRmCalculatorClient` for
 * real-time calculation and form submission.
 */
export default async function OneRmPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string }>;
}) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const athleteId = params.athleteId ?? null;

  const efc = await createEfcTrainingDeps();

  // Fetch athlete profile and recent 1RM records in parallel when an athlete
  // is selected. Profile is needed for EFC period–based recommendations.
  const [profile, recentOneRms] = athleteId
    ? await Promise.all([
        efc.profiles.findByAthleteId(athleteId, membership.tenantId),
        efc.oneRm.findByAthleteId(athleteId, membership.tenantId),
      ])
    : [null, []];

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="space-y-1 px-1">
        <nav aria-label="Migas de pan" className="mb-2">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link
                href="/dashboard/trainings/efc"
                className="transition-colors hover:text-foreground"
              >
                Planificación EFC
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Calculadora 1RM</li>
          </ol>
        </nav>

        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
          <Dumbbell aria-hidden="true" className="h-4 w-4" />
          Método EFC
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Calculadora de 1 Repetición Máxima
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Estima el 1RM a partir de un levantamiento submáximo usando las
          fórmulas de Epley y Brzycki. Los resultados se calculan en tiempo
          real.
        </p>
      </header>

      {/* ── Calculator ───────────────────────────────────────────────────── */}
      <section
        aria-label="Calculadora 1RM EFC"
        className="rounded-2xl border border-white/6 bg-card p-4 shadow-lg shadow-black/10 sm:p-6"
      >
        <OneRmCalculatorClient
          athleteId={athleteId}
          efcPeriod={profile?.efcPeriod ?? null}
          recentOneRms={recentOneRms}
        />
      </section>
    </div>
  );
}
