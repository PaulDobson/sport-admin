import { Brain } from "lucide-react";
import { CognitivePanel } from "./_components/cognitive-panel";

export default function CognitivePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="space-y-1 px-1">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
          <Brain aria-hidden="true" className="h-4 w-4" />
          Herramientas de entrenamiento
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Entrenamiento Cognitivo
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Configura los estímulos visuales, define las series y proyecta el
          ejercicio en pantalla completa. Los estímulos aparecen aleatoriamente
          durante cada fase de trabajo.
        </p>
      </header>

      {/* ── Cognitive panel (client component) ───────────────────────────── */}
      <section
        aria-label="Panel de entrenamiento cognitivo"
        className="rounded-2xl border border-white/6 bg-card p-4 shadow-lg shadow-black/10 sm:p-6"
      >
        <CognitivePanel />
      </section>
    </div>
  );
}
