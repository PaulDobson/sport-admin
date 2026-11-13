"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { Student } from "@/domain/instructor-operations/student";

interface Props {
  athletes: Student[];
}

/**
 * EfcAthleteSelector — shown when no athleteId is in the URL.
 * Redirects to the same page with ?athleteId= after selection.
 */
export function EfcAthleteSelector({ athletes }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id) router.push(`/dashboard/trainings/efc?athleteId=${id}`);
  }

  return (
    <section
      className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-12 text-center"
      aria-label="Selección de deportista"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <Users className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Selecciona un deportista</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          El dashboard EFC, el planificador y la calculadora 1RM se adaptarán al período activo del deportista.
        </p>
      </div>
      <label className="w-full max-w-xs">
        <span className="sr-only">Deportista</span>
        <select
          onChange={handleChange}
          defaultValue=""
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <option value="" disabled>
            — Elegir deportista —
          </option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
