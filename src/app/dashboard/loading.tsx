export default function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando dashboard"
      className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:pl-[var(--sidebar-width)]"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-surface-raised" />
        <div className="h-28 animate-pulse rounded-2xl bg-card" />
        <div className="h-52 animate-pulse rounded-2xl bg-card" />
      </div>
    </main>
  );
}
