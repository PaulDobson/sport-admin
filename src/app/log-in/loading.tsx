export default function LogInLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando ingreso"
      className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4"
    >
      <div className="h-8 w-40 animate-pulse rounded-xl bg-surface-raised" />
      <div className="space-y-3">
        <div className="h-11 animate-pulse rounded-lg bg-card" />
        <div className="h-11 animate-pulse rounded-lg bg-card" />
        <div className="h-11 w-2/3 animate-pulse rounded-lg bg-card" />
      </div>
    </main>
  );
}
