import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { listDisciplines } from "@/application/instructor-operations/use-cases/manage-disciplines";
import { createDisciplineAdministrationDeps } from "@/infrastructure/composition/discipline-administration-composition";
import { DisciplinesWorkspace } from "./disciplines-workspace";

function positiveInteger(
  value: string | undefined,
  fallback: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, max)
    : fallback;
}

export default async function DisciplinesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const search = (params.search ?? "").trim().slice(0, 200);
  const status =
    params.status === "active" || params.status === "archived"
      ? params.status
      : "all";
  const deps = await createDisciplineAdministrationDeps();
  const disciplines = await listDisciplines(
    {
      tenantId: membership.tenantId,
      search,
      status,
      page: positiveInteger(params.page, 1, 10_000),
      pageSize: positiveInteger(params.pageSize, 10, 50),
    },
    deps,
  );

  // ScheduleNavigation was removed — Disciplines is now under "Configuración /
  // Mi gimnasio" in the sidebar, not under Sesiones. The topbar already shows
  // "Configuración · Mi gimnasio > Disciplinas" so no inline section nav needed.
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DisciplinesWorkspace
        disciplines={disciplines}
        search={search}
        status={status}
        canManage={membership.role !== "assistant"}
      />
    </div>
  );
}
