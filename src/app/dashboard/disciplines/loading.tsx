import { Skeleton, Surface } from "@/presentation/components/primitives";

export default function LoadingDisciplines() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label="Cargando disciplinas">
      <Surface className="space-y-4 p-7"><Skeleton className="h-6 w-36" /><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-2/3" /></Surface>
      <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((key) => <Surface key={key}><Skeleton className="h-16 w-full" /></Surface>)}</div>
      <Surface className="space-y-5">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-16 w-full" />)}</Surface>
    </div>
  );
}
