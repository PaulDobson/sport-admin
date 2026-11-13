import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { MicrocycleBuilderClient } from "./microcycle-builder-client";

export default async function MicyclePage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string; macrocycleId?: string }>;
}) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const athleteId = params.athleteId ?? null;
  const efc = await createEfcTrainingDeps();

  let macrocycleId = params.macrocycleId ?? null;

  // Auto-resolve active macrocycle if not supplied
  if (!macrocycleId && athleteId) {
    const active = await efc.macrocycles.findActiveByAthleteId(
      athleteId,
      membership.tenantId,
    );
    if (active) {
      redirect(
        `/dashboard/trainings/efc/microcycle?athleteId=${athleteId}&macrocycleId=${active.id}`,
      );
    }
  }

  const [macrocycle, existingMicrocycles] = macrocycleId
    ? await Promise.all([
        efc.macrocycles.findById(macrocycleId, membership.tenantId),
        efc.microcycles.findByMacrocycleId(macrocycleId),
      ])
    : [null, []];

  return (
    <div className="space-y-8 pb-4 pt-2">
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
            <li className="text-foreground">Microciclos</li>
          </ol>
        </nav>

        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
          <Calendar aria-hidden="true" className="h-4 w-4" />
          Método EFC
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Constructor de Microciclos
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Asigna minutos por actividad para cada día de la semana y registra la
          carga interna post-sesión.
        </p>
      </header>

      {!macrocycle ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <Calendar
            className="h-10 w-10 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-semibold">Sin macrociclo activo</p>
          <p className="text-sm text-muted-foreground">
            Selecciona un deportista con macrociclo activo para crear
            microciclos.
          </p>
        </div>
      ) : (
        <MicrocycleBuilderClient
          macrocycle={macrocycle}
          existingMicrocycles={existingMicrocycles}
          athleteId={athleteId ?? ""}
        />
      )}
    </div>
  );
}
