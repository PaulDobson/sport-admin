import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Eye, Pencil, Plus, Search } from "lucide-react";
import { listStudentsForAdministration } from "@/application/instructor-operations/use-cases/list-students-for-administration";
import type { StudentAdministrationStatusFilter } from "@/application/instructor-operations/ports/student-repository-port";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { AccountContextMenu } from "@/presentation/components/account-context-menu";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import {
  EmptyState,
  StatusBadge,
  Surface,
} from "@/presentation/components/primitives";
import { StudentArchiveButton } from "./student-archive-button";
import { StudentForm } from "./student-form";

interface StudentsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
}

function roleLabelFor(role: string) {
  return role === "owner"
    ? "Dueño"
    : role === "assistant"
      ? "Asistente"
      : role === "admin"
        ? "Administrador"
        : role;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseStatus(
  value: string | undefined,
): StudentAdministrationStatusFilter {
  return value === "archived" || value === "all" ? value : "active";
}

function buildStudentsHref(
  params: Record<string, string | number | null | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && String(value).length > 0) {
      query.set(key, String(value));
    }
  }
  const serialized = query.toString();
  return serialized
    ? `/dashboard/students?${serialized}`
    : "/dashboard/students";
}

function contactLabel(
  contact: { type: string; label: string | null; value: string } | null,
) {
  if (!contact) return "Sin contacto";
  const typeLabel =
    contact.type === "email"
      ? "Email"
      : contact.type === "emergency"
        ? "Emergencia"
        : "Teléfono";
  return `${contact.label ?? typeLabel}: ${contact.value}`;
}

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const page = parsePositiveInteger(params.page, 1, 10_000);
  const pageSize = parsePositiveInteger(params.pageSize, 10, 50);
  const search = params.search?.trim() ?? "";
  const status = parseStatus(params.status);

  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const operations = await createInstructorOperationsDeps();
  const [students, profile, tenants] = await Promise.all([
    listStudentsForAdministration(
      {
        tenantId: membership.tenantId,
        page,
        pageSize,
        search,
        status,
      },
      operations,
    ),
    auth.profiles.findByUserId(userId),
    auth.tenants.findOperationalByUser(userId),
  ]);

  const roleLabel = roleLabelFor(membership.role);
  const academyName =
    tenants.find((tenant) => tenant.id === membership.tenantId)?.name ??
    "Academia activa";
  const canManageStudents = membership.role !== "assistant";
  const totalPages = Math.max(1, Math.ceil(students.total / students.pageSize));
  const currentPage = Math.min(students.page, totalPages);
  const exportParams = new URLSearchParams();
  if (search) exportParams.set("search", search);
  exportParams.set("status", status);
  exportParams.set("page", String(currentPage));
  exportParams.set("pageSize", String(pageSize));

  return (
    <AppShell
      sidebarHeader={<ProductMark context={roleLabel} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={<QuickActionMenu role={membership.role} />}
        />
      }
      topbar={
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Alumnos
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              Administración de alumnos
            </h1>
          </div>
          <span className="hidden h-8 items-center rounded-full border border-border bg-surface-raised px-3 text-xs font-semibold text-muted-foreground sm:inline-flex">
            {academyName} · {roleLabel}
          </span>
          <span className="hidden h-8 items-center rounded-full border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary md:inline-flex">
            {students.total} resultados
          </span>
        </div>
      }
      topbarActions={
        <AccountContextMenu
          profileName={profile?.fullName || "Tu cuenta"}
          currentTenantId={membership.tenantId}
          roleLabel={roleLabel}
          tenants={tenants.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
          }))}
        />
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <Surface className="grid gap-5 overflow-hidden p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {academyName} · {roleLabel}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Gestiona alumnos con más espacio de trabajo
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Registros, contactos, estados y acciones quedan en una vista más
              amplia para operar dentro de la academia activa.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-border bg-background/45 px-3 py-1 text-muted-foreground">
                {status === "archived"
                  ? "Archivados"
                  : status === "all"
                    ? "Todos"
                    : "Activos"}
              </span>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                {students.total} resultados
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap lg:justify-end">
            {canManageStudents ? (
              <Link
                href={`/api/students/export?${exportParams.toString()}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar Excel
              </Link>
            ) : null}
            {canManageStudents ? (
              <a
                href="#new-student-heading"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo alumno
              </a>
            ) : null}
          </div>
        </Surface>

        <section aria-labelledby="student-list-heading">
          <Surface className="p-0">
            <div className="border-b border-border p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="student-list-heading"
                    className="text-xl font-semibold"
                  >
                    Tabla de alumnos
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} · {students.total}{" "}
                    resultados
                  </p>
                </div>
              </div>
              <form
                className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_8rem_auto]"
                method="get"
              >
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Buscar
                  <span className="relative block">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      name="search"
                      defaultValue={search}
                      placeholder="Nombre del alumno"
                      className="h-10 w-full rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm font-normal normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </span>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Estado
                  <select
                    name="status"
                    defaultValue={status}
                    className="h-10 rounded-lg border border-input bg-background/50 px-3 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Activos</option>
                    <option value="archived">Archivados</option>
                    <option value="all">Todos</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Filas
                  <select
                    name="pageSize"
                    defaultValue={String(pageSize)}
                    className="h-10 rounded-lg border border-input bg-background/50 px-3 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </label>
                <input type="hidden" name="page" value="1" />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay sm:self-end"
                >
                  Aplicar
                </button>
              </form>
            </div>

            {students.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-surface-raised/60 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Alumno
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Contacto
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Nacimiento
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.rows.map((student) => (
                      <tr key={student.id} className="align-middle">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-foreground">
                            {student.fullName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Creado {student.createdAt.toLocaleDateString("es")}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {contactLabel(student.primaryContact)}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {student.birthDate ?? "No registrado"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge
                            tone={
                              student.status === "active"
                                ? "success"
                                : "neutral"
                            }
                          >
                            {student.status === "active"
                              ? "Activo"
                              : "Archivado"}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/students/${student.id}`}
                              aria-label={`Visualizar ${student.fullName}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-surface-raised"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            {canManageStudents ? (
                              <Link
                                href={`/dashboard/students/${student.id}/edit`}
                                aria-label={`Editar ${student.fullName}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-surface-raised"
                              >
                                <Pencil
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </Link>
                            ) : null}
                            {canManageStudents &&
                            student.status === "active" ? (
                              <StudentArchiveButton
                                studentId={student.id}
                                studentName={student.fullName}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Sin alumnos para esta vista"
                description="Ajusta los filtros o registra un alumno nuevo dentro de la academia activa."
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-muted-foreground">
              <span>
                Mostrando {students.rows.length} de {students.total}
              </span>
              <div className="flex gap-2">
                <Link
                  href={buildStudentsHref({
                    search,
                    status,
                    pageSize,
                    page: Math.max(1, currentPage - 1),
                  })}
                  aria-disabled={currentPage <= 1}
                  className={
                    currentPage <= 1
                      ? "pointer-events-none inline-flex h-9 items-center rounded-lg border border-border px-3 opacity-45"
                      : "inline-flex h-9 items-center rounded-lg border border-border px-3 font-semibold text-foreground hover:bg-surface-raised"
                  }
                >
                  Anterior
                </Link>
                <Link
                  href={buildStudentsHref({
                    search,
                    status,
                    pageSize,
                    page: Math.min(totalPages, currentPage + 1),
                  })}
                  aria-disabled={currentPage >= totalPages}
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none inline-flex h-9 items-center rounded-lg border border-border px-3 opacity-45"
                      : "inline-flex h-9 items-center rounded-lg border border-border px-3 font-semibold text-foreground hover:bg-surface-raised"
                  }
                >
                  Siguiente
                </Link>
              </div>
            </div>
          </Surface>
        </section>

        {canManageStudents ? (
          <section aria-labelledby="new-student-heading">
            <h2 id="new-student-heading" className="mb-3 text-xl font-semibold">
              Nuevo alumno
            </h2>
            <StudentForm />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
