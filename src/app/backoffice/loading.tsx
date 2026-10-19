import { Skeleton } from "@/presentation/components/primitives";

export default function BackofficeLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando administración SaaS"
      className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:pl-[calc(var(--sidebar-width)+1.5rem)] lg:pt-[calc(var(--topbar-height)+1.75rem)]"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl bg-card" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Skeleton className="h-80 rounded-2xl bg-card" />
          <Skeleton className="h-80 rounded-2xl bg-card" />
        </div>
      </div>
    </main>
  );
}
