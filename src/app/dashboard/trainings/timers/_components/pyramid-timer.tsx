"use client";

import { Construction, TrendingUp } from "lucide-react";

export function PyramidTimer() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-16 sm:py-24 text-center">
      {/* Icon */}
      <div className="grid h-20 w-20 place-items-center rounded-3xl border border-info/30 bg-info/10">
        <TrendingUp aria-hidden="true" className="h-10 w-10 text-info" />
      </div>

      {/* Heading */}
      <div className="max-w-sm space-y-2">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          Timer Piramidal
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          La lógica de este temporizador está en desarrollo. Pronto podrás
          configurar series con incrementos y decrementos de tiempo automáticos,
          ideal para entrenamientos de alta intensidad progresiva.
        </p>
      </div>

      {/* Coming soon badge */}
      <span className="inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-info">
        <Construction aria-hidden="true" className="h-3.5 w-3.5" />
        Próximamente
      </span>
    </div>
  );
}
