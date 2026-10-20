import { Timer } from "lucide-react";
import { TimersPanel } from "./_components/timers-panel";

export default function TimersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="space-y-1 px-1">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          <Timer aria-hidden="true" className="h-4 w-4" />
          Herramientas de entrenamiento
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Temporizadores
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Selecciona el modo que mejor se adapte a tu sesión, configura los
          tiempos e inicia.
        </p>
      </header>

      {/* ── Timers panel (client component) ──────────────────────────────── */}
      <section
        aria-label="Panel de temporizadores"
        className="rounded-2xl border border-white/6 bg-card p-4 shadow-lg shadow-black/10 sm:p-6"
      >
        <TimersPanel />
      </section>
    </div>
  );
}
