import Link from "next/link";
import { Scale } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEfcTrainingDeps } from "@/infrastructure/composition/efc-training-composition";
import { getWeightControlData } from "@/application/efc-training/use-cases";
import { WeightControlClient } from "./weight-control-client";

export default async function WeightControlPage({
  searchParams,
}: {
  searchParams: Promise<{ athleteId?: string }>;
}) {
  const membership = await requireOperationalMembership();
  const { athleteId } = await searchParams;
  const efc = await createEfcTrainingDeps();

  const { records, metrics } = athleteId
    ? await getWeightControlData(athleteId, membership.tenantId, 90, {
        weightControl: efc.weightControl,
      })
    : { records: [], metrics: null };

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
            <li className="text-foreground">Control de Peso</li>
          </ol>
        </nav>

        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
          <Scale aria-hidden="true" className="h-4 w-4" />
          Método EFC
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Control de Peso — Competencia
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Monitorea el descenso de peso previo al pesaje oficial y detecta
          riesgos de deshidratación.
        </p>
      </header>

      <WeightControlClient
        athleteId={athleteId ?? ""}
        records={records}
        metrics={metrics}
      />
    </div>
  );
}
