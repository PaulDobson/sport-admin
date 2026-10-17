import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FilterX, Plus, Search, Users } from "lucide-react";
import { listStudentsForAdministration } from "@/application/instructor-operations/use-cases/list-students-for-administration";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import {
  parseStudentListQuery,
  studentListHref,
  studentQueryString,
  studentTaskHref,
  studentLinkClass,
  type StudentListParams,
} from "@/presentation/navigation/student-navigation";
import { StudentList } from "./student-list";
import { StudentWorkspace } from "./student-workspace";

const statusOptions = [
  ["active", "Activos"],
  ["archived", "Archivados"],
  ["all", "Todos"],
] as const;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<StudentListParams>;
}) {
  const membership = await requireOperationalMembership();
  const query = parseStudentListQuery(await searchParams);
  const operations = await createInstructorOperationsDeps();
  const students = await listStudentsForAdministration(
    { tenantId: membership.tenantId, ...query },
    operations,
  );
  if (students.page !== query.page) {
    redirect(studentListHref({ ...query, page: students.page }));
  }
  const canManage = membership.role !== "assistant";
  const studentsWithMembership = canManage && students.rows.length > 0
    ? await createInstructorFinanceDeps()
      .then(finance => finance.memberships.findStudentIdsWithCurrentMembership(membership.tenantId, students.rows.map(row => row.id)))
      .catch(() => undefined)
    : undefined;
  const totalPages = Math.max(1, Math.ceil(students.total / students.pageSize));
  const newHref = studentTaskHref("/dashboard/students/new", query);
  const isFiltered = Boolean(query.search || query.status !== "active");
  const clearHref = studentListHref({
    ...query,
    search: "",
    status: "active",
    page: 1,
  });
  const first = students.total === 0
    ? 0
    : (students.page - 1) * students.pageSize + 1;
  const last = students.total === 0 ? 0 : first + students.rows.length - 1;
  const pageSizes = [...new Set([10, 25, 50, 100, query.pageSize])]
    .sort((a, b) => a - b);

  const pageNumbers = paginationWindow(students.page, totalPages);
  const pagerItem = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <StudentWorkspace>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Alumnos</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Organiza sus datos y accede a cada ficha.
            </p>
          </div>
        </div>

        <section aria-label="Filtros de alumnos" className="rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2 sm:basis-auto">
              <label className="relative min-w-0 flex-1 basis-56">
                <span className="sr-only">Buscar por nombre</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  name="search"
                  defaultValue={query.search}
                  placeholder="Buscar alumno…"
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                />
              </label>
              <label className="shrink-0">
                <span className="sr-only">Por página</span>
                <select
                  name="pageSize"
                  defaultValue={String(query.pageSize)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {pageSizes.map(size => (
                    <option key={size} value={size}>{size} por página</option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="status" value={query.status} />
              <input type="hidden" name="page" value="1" />
              <button
                type="submit"
                aria-label="Buscar"
                title="Buscar"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
            <nav
              aria-label="Estado de alumnos"
              className="flex h-10 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5"
            >
              {statusOptions.map(([status, label]) => (
                <Link
                  key={status}
                  href={studentListHref({ ...query, status, page: 1 })}
                  aria-current={query.status === status ? "page" : undefined}
                  className={`inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors ${
                    query.status === status
                      ? "bg-surface-raised text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            {isFiltered ? (
              <Link
                href={clearHref}
                aria-label="Limpiar filtros"
                title="Limpiar filtros"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                <FilterX className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            {canManage ? (
              <div className="ml-auto flex items-center gap-2">
                <Link
                  href={`/api/students/export?${studentQueryString(query)}`}
                  aria-label="Exportar página a Excel"
                  title="Exportar página a Excel"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href={newHref}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nuevo alumno
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section aria-label="Administración de alumnos" className="overflow-hidden rounded-xl border border-border bg-card">
          {students.rows.length ? (
            <StudentList rows={students.rows} query={query} canManage={canManage} studentsWithMembership={studentsWithMembership} />
          ) : (
            <div className="grid justify-items-center gap-3 px-4 py-12 text-center">
              <Users className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-lg font-semibold">
                {isFiltered ? "Sin resultados para estos filtros" : "Aún no hay alumnos activos"}
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {isFiltered
                  ? "Prueba otro nombre o consulta los alumnos activos."
                  : "Registra un alumno o consulta la vista de archivados."}
              </p>
              {isFiltered ? (
                <Link href={clearHref} className={studentLinkClass}>
                  Limpiar búsqueda y filtros
                </Link>
              ) : canManage ? (
                <Link href={newHref} className={studentLinkClass}>Registrar alumno</Link>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm sm:px-5">
            <p className="text-muted-foreground">
              Mostrando {first}–{last} de {students.total}
            </p>
            <nav aria-label="Paginación de alumnos" className="flex flex-wrap items-center gap-1.5">
              {students.page > 1 ? (
                <Link href={studentListHref({ ...query, page: students.page - 1 })} className={pagerItem}>
                  Anterior
                </Link>
              ) : (
                <span aria-disabled="true" className={`${pagerItem} opacity-45`}>Anterior</span>
              )}
              {pageNumbers.map((pageNumber, index) =>
                pageNumber === null ? (
                  <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">…</span>
                ) : pageNumber === students.page ? (
                  <span
                    key={pageNumber}
                    aria-current="page"
                    className={`${pagerItem} metric-number border-primary bg-primary text-primary-foreground hover:bg-primary`}
                  >
                    <span className="sr-only">Página </span>{pageNumber}<span className="sr-only"> de {totalPages}</span>
                  </span>
                ) : (
                  <Link
                    key={pageNumber}
                    href={studentListHref({ ...query, page: pageNumber })}
                    aria-label={`Página ${pageNumber}`}
                    className={`${pagerItem} metric-number`}
                  >
                    {pageNumber}
                  </Link>
                ),
              )}
              {students.page < totalPages ? (
                <Link href={studentListHref({ ...query, page: students.page + 1 })} className={pagerItem}>
                  Siguiente
                </Link>
              ) : (
                <span aria-disabled="true" className={`${pagerItem} opacity-45`}>Siguiente</span>
              )}
            </nav>
          </div>
        </section>
      </div>
    </StudentWorkspace>
  );
}

function paginationWindow(current: number, total: number): Array<number | null> {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter(page => page >= 1 && page <= total).sort((a, b) => a - b);
  return sorted.flatMap((page, index) =>
    index > 0 && page - sorted[index - 1] > 1 ? [null, page] : [page],
  );
}
