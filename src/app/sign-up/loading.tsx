export default function SignUpLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando registro"
      className="flex min-h-dvh flex-col bg-[#0c1215] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]"
    >
      <div className="min-h-64 animate-pulse bg-surface-raised lg:min-h-dvh" />
      <div className="flex flex-1 items-center px-5 pt-10 pb-[calc(2.5rem+var(--safe-area-bottom))] sm:px-10 lg:min-h-dvh lg:flex-none lg:px-14 lg:pb-10 xl:px-20">
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
          <div className="h-10 w-5/6 animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="pt-4">
            <div className="h-12 animate-pulse rounded-lg bg-surface-raised" />
            <div className="mt-5 h-12 animate-pulse rounded-lg bg-surface-raised" />
            <div className="mt-5 h-12 animate-pulse rounded-lg bg-surface-raised" />
            <div className="mt-5 h-12 animate-pulse rounded-lg bg-primary/30" />
          </div>
        </div>
      </div>
    </main>
  );
}
