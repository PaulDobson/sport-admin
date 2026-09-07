export default function BackofficeLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando administración SaaS"
      className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:pl-64"
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-surface-raised" />
        <div className="h-32 animate-pulse rounded-2xl bg-card" />
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    </main>
  );
}
