"use client";

export default function BackofficeError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:pl-64">
      <section
        role="alert"
        className="mx-auto max-w-xl rounded-2xl border border-destructive bg-card p-6 shadow-2xl shadow-black/10"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
          Error de plataforma
        </p>
        <h1 className="mt-2 text-xl font-semibold">
          No pudimos cargar esta sección
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La administración permanece separada de la operación. Intenta
          nuevamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
