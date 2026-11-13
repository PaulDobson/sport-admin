import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { LoadChartsClient } from "./load-charts-client";

export default async function LoadChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string }>;
}) {
  const membership = await requireOperationalMembership();
  const { athleteId } = await searchParams;
  const efc = await createEfcTrainingDeps();

  const macrocycle = athleteId
    ? await efc.macrocycles.findActiveByAthleteId(
        athleteId,
        membership.tenantId,
      )
    : null;

  const microcycles = macrocycle
    ? await efc.microcycles.findByMacrocycleId(macrocycle.id)
    : [];

  // Collect loads for each microcycle
  const microcycleLoads = await Promise.all(
    microcycles.map(async (mc) => ({
      microcycle: mc,
      loads: await efc.microcycles.findLoadsByMicrocycleId(mc.id),
    })),
  );

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
            <li className="text-foreground">Ondulación de Carga</li>
          </ol>
        </nav>

        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
          <TrendingUp aria-hidden="true" className="h-4 w-4" />
          Método EFC
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ondulación de Carga
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Visualiza el volumen semanal, la distribución EFC y la intensidad
          diaria del macrociclo activo.
        </p>
      </header>

      <LoadChartsClient
        macrocycle={macrocycle}
        microcycleLoads={microcycleLoads}
      />
    </div>
  );
}
