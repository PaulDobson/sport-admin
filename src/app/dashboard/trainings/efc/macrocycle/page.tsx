import { Calendar, TrendingUp } from "lucide-react";
import Link from "next/link";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { MacrocyclePlannerClient } from "./macrocycle-planner-client";

/**
 * MacrocyclePage — Server Component
 *
 * Loads the athlete list and any existing macrocycles for the selected athlete,
 * then hands everything to `MacrocyclePlannerClient` for real-time calculation
 * and form submission.
 */
export default async function MacrocyclePage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string; saved?: string }>;
}) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const athleteId = params.athleteId ?? null;

  const [ops, efc] = await Promise.all([
    createInstructorOperationsDeps(),
    createEfcTrainingDeps(),
  ]);

  // Fetch the full athlete list for the selector
  const athletes = await ops.students.findActiveByTenant(membership.tenantId);

  // Fetch any existing macrocycles for the selected athlete
  const existingMacrocycles = athleteId
    ? await efc.macrocycles.findByAthleteId(athleteId, membership.tenantId)
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="space-y-1 px-1">
        <nav aria-label="Migas de pan" className="mb-2">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link
                href="/dashboard/trainings/efc"
                className="hover:text-foreground transition-colors"
              >
                Planificación EFC
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Macrociclo</li>
          </ol>
        </nav>

        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
          <TrendingUp aria-hidden="true" className="h-4 w-4" />
          Método EFC
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Planificador de Macrociclo
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Define el período de competencia, los parámetros de carga y la
          distribución Estructura / Función / Cognición. Los totales se
          calculan en tiempo real.
        </p>
      </header>

      {/* ── Empty state: no athletes ──────────────────────────────────── */}
      {athletes.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">No hay deportistas activos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registra deportistas en la sección de gestión antes de crear un macrociclo.
            </p>
          </div>
          <Link
            href="/dashboard/students"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary"
          >
            Gestionar deportistas
          </Link>
        </section>
      ) : (
        /* ── Planner client ───────────────────────────────────────────── */
        <section
          aria-label="Planificador de macrociclo EFC"
          className="rounded-2xl border border-white/6 bg-card p-4 shadow-lg shadow-black/10 sm:p-6"
        >
          <MacrocyclePlannerClient
            athletes={athletes}
            initialAthleteId={athleteId}
            existingMacrocycles={existingMacrocycles}
            tenantId={membership.tenantId}
          />
        </section>
      )}
    </div>
  );
}
