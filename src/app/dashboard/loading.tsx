export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando dashboard"
      className="py-1"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-surface-raised" />
        <div className="h-28 animate-pulse rounded-2xl bg-card" />
        <div className="h-52 animate-pulse rounded-2xl bg-card" />
      </div>
    </div>
  );
}
