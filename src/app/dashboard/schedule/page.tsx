import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  FilterX,
  Plus,
  Search,
  UsersRound,
  ListChecks,
  LayoutGrid,
  Table2,
  CalendarRange,
} from "lucide-react";
import { getScheduleSessions } from "@/application/instructor-operations/use-cases/get-schedule-sessions";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import {
  Button,
  EmptyState,
  Surface,
} from "@/presentation/components/primitives";
import { ScheduleNavigation } from "@/presentation/components/schedule-navigation";
import { SessionList } from "./session-list";
import { SessionTable } from "./session-table";
import { SessionCalendar, type CalendarSession } from "./session-calendar";
import { sessionPeriod, sessionPeriodTitle } from "./session-period";
import {
  isSessionCurrent,
  operationalDateKey,
  sessionCalendarState,
  sessionOccupiedCount,
} from "./session-presentation";

const calendarPageSize = 500;

interface SchedulePageProps {
  searchParams: Promise<{
    location?: string;
    discipline?: string;
    date?: string;
    period?: string;
    view?: string;
    status?: "all" | "scheduled" | "cancelled" | "completed";
    page?: string;
  }>;
}

const actionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function normalizedStatus(
  value?: string,
): "all" | "scheduled" | "cancelled" | "completed" {
  switch (value) {
    case "all":
    case "cancelled":
    case "completed":
      return value;
    default:
      return "scheduled";
  }
}

export default async function SchedulePage({
  searchParams,
}: SchedulePageProps) {
  const context = await loadOperationalContext();
  if (context.status === "unauthenticated") redirect("/log-in");
  if (context.status === "no-membership") redirect("/onboarding");
  if (context.status === "selection-required") redirect("/select-tenant");
  if (context.status === "no-operational-tenant") redirect("/dashboard");

  const membership = context.membership;
  const canManage = membership.role !== "assistant";
  const params = await searchParams;
  const location = params.location;
  const selectedStatus = normalizedStatus(params.status);
  const now = new Date();
  const date = params.date || operationalDateKey(now);
  const period =
    params.period === "day" || params.period === "week"
      ? params.period
      : "month";
  const view =
    params.view === "table" || params.view === "calendar"
      ? params.view
      : "grid";
  const isCalendar = view === "calendar";
  const range = sessionPeriod(date, period);
  const periodTitle = sessionPeriodTitle(range, period);
  const operations = await createInstructorOperationsDeps();
  const schedule = await getScheduleSessions(
    {
      tenantId: membership.tenantId,
      locationId: location,
      disciplineId: params.discipline || undefined,
      status: selectedStatus,
      from: range.from,
      through: range.through,
      ...(isCalendar
        ? { page: 1, pageSize: calendarPageSize }
        : { page: params.page }),
    },
    operations,
  );
  const sessions = schedule.sessions;
  const currentCount = sessions.filter(
    (session) =>
      session.status !== "cancelled" &&
      session.status !== "completed" &&
      isSessionCurrent(session, now),
  ).length;
  const selectedLocation = schedule.locations.find(
    (item) => item.id === location,
  );
  const confirmedCount = sessions.reduce(
    (total, session) => total + session.confirmedCount,
    0,
  );
  const waitingCount = sessions.reduce(
    (total, session) => total + session.waitlistedCount,
    0,
  );
  const pageCount = Math.max(1, Math.ceil(schedule.total / schedule.pageSize));
  const filterParams = new URLSearchParams();
  if (location) filterParams.set("location", location);
  if (params.discipline) filterParams.set("discipline", params.discipline);
  if (selectedStatus !== "scheduled")
    filterParams.set("status", selectedStatus);
  filterParams.set("date", date);
  filterParams.set("period", period);
  filterParams.set("view", view);
  const displayHref = (nextPeriod: string, nextDate = date) => {
    const next = new URLSearchParams(filterParams);
    next.set("period", nextPeriod);
    next.set("date", nextDate);
    return `/dashboard/schedule?${next.toString()}`;
  };
  const previousDate = new Date(`${range.from}T12:00:00Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const nextDate = new Date(`${range.through}T12:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const clearParams = new URLSearchParams({ date, period, view });
  const clearHref = `/dashboard/schedule?${clearParams.toString()}`;
  const viewHref = (nextView: string) => {
    const next = new URLSearchParams(filterParams);
    next.set("view", nextView);
    next.set("page", String(schedule.page));
    return `/dashboard/schedule?${next.toString()}`;
  };
  const pageHref = (page: number) => {
    const next = new URLSearchParams(filterParams);
    next.set("page", String(page));
    return `/dashboard/schedule?${next.toString()}`;
  };
  const pagerClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const pagination =
    schedule.total > 0 ? (
      <nav
        aria-label="Paginación de sesiones"
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <p className="tabular-nums">
          <span className="sr-only">
            Página {schedule.page} de {pageCount} ·{" "}
          </span>
          {(schedule.page - 1) * schedule.pageSize + 1}–
          {Math.min(schedule.page * schedule.pageSize, schedule.total)} de{" "}
          {schedule.total}
        </p>
        {schedule.page > 1 ? (
          <Link
            href={pageHref(schedule.page - 1)}
            aria-label="Anterior"
            title="Página anterior"
            className={`${pagerClass} text-foreground hover:bg-surface-raised`}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${pagerClass} opacity-40`}>
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        {pageCount > 2 ? (
          <form
            method="get"
            action="/dashboard/schedule"
            className="flex items-center gap-1"
          >
            {Array.from(filterParams.entries()).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <label htmlFor="session-page" className="sr-only">
              Ir a página
            </label>
            <input
              id="session-page"
              name="page"
              type="number"
              inputMode="numeric"
              min="1"
              max={pageCount}
              defaultValue={schedule.page}
              required
              className="h-9 w-12 rounded-md border border-input bg-background px-1 text-center text-xs text-foreground"
            />
            <span aria-hidden="true">/ {pageCount}</span>
            <button
              type="submit"
              className="sr-only focus:not-sr-only focus:rounded-md focus:border focus:border-border focus:px-2 focus:py-1"
            >
              Ir
            </button>
          </form>
        ) : (
          <span aria-hidden="true" className="tabular-nums">
            {schedule.page} / {pageCount}
          </span>
        )}
        {schedule.page < pageCount ? (
          <Link
            href={pageHref(schedule.page + 1)}
            aria-label="Siguiente"
            title="Página siguiente"
            className={`${pagerClass} text-foreground hover:bg-surface-raised`}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${pagerClass} opacity-40`}>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </nav>
    ) : null;

  const calendarQuery = new URLSearchParams(filterParams);
  calendarQuery.delete("date");
  calendarQuery.delete("period");
  const calendarBaseQuery = calendarQuery.toString();
  const calendarSessions: CalendarSession[] = isCalendar
    ? sessions.map((session) => ({
        id: session.id,
        name: session.name,
        locationName: session.locationName,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        dateKey: operationalDateKey(session.startsAt),
        capacity: session.capacity,
        occupied: sessionOccupiedCount(session),
        waitlisted: session.waitlistedCount,
        state: sessionCalendarState(session, now),
      }))
    : [];

  const dateNavigation = (
    <nav
      aria-label="Navegación de fechas"
      className="flex min-w-0 items-center gap-1"
    >
      <Link
        href={displayHref(
          period,
          previousDate.toISOString().slice(0, 10),
        )}
        aria-label="Período anterior"
        title="Período anterior"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </Link>
      {isCalendar ? null : (
        <p className="px-1 text-sm font-semibold first-letter:uppercase">
          {periodTitle}
        </p>
      )}
      <Link
        href={displayHref(period, nextDate.toISOString().slice(0, 10))}
        aria-label="Período siguiente"
        title="Período siguiente"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Link>
      <Link
        href={displayHref(period, operationalDateKey(now))}
        className="inline-flex h-9 items-center rounded-md px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Hoy
      </Link>
    </nav>
  );

  return (
    <div
      className={`mx-auto space-y-6 ${isCalendar ? "max-w-7xl" : "max-w-6xl"}`}
    >
      <Surface className="border-primary/15 bg-linear-to-br from-primary/10 via-card to-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              Tu agenda de entrenamiento
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Administra tus sesiones
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Encuentra rápidamente una sesión por disciplina. Edita, cancela o
              reactiva sesiones desde el teléfono o el escritorio.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/dashboard/schedule/programming"
              className={`${actionClass} border-primary bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Programar sesiones
            </Link>
          ) : null}
        </div>
      </Surface>

      <section
        aria-label="Resumen de las sesiones mostradas"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            label: isCalendar ? "En este período" : "En esta página",
            value: sessions.length,
            detail: `${schedule.total} resultados · ${currentCount} en curso`,
            icon: CalendarDays,
          },
          {
            label: "Reservas confirmadas",
            value: confirmedCount,
            detail: "En las sesiones de esta vista",
            icon: UsersRound,
          },
          {
            label: "En lista de espera",
            value: waitingCount,
            detail: "Reservas pendientes de cupo",
            icon: ListChecks,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <Surface key={label} className="flex min-w-0 items-start gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                {label}
              </p>
              <p className="metric-number mt-1 text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
          </Surface>
        ))}
      </section>

      <Surface
        aria-labelledby="session-filter-heading"
        aria-describedby="session-filter-description"
        className="p-3 sm:p-4"
      >
        <form
          method="get"
          action="/dashboard/schedule"
          className="grid grid-cols-2 items-center gap-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="period" value={period} />
          <h2
            id="session-filter-heading"
            className="col-span-2 flex items-center gap-2 text-sm font-semibold lg:col-span-1 lg:pr-2"
          >
            <Filter aria-hidden="true" className="h-4 w-4 text-primary" />
            Filtros
          </h2>
          <p id="session-filter-description" className="sr-only">
            Filtra por disciplina, ubicación o estado.
          </p>
          <label className="min-w-0">
            <span className="sr-only">Disciplina</span>
            <select
              name="discipline"
              defaultValue={params.discipline ?? ""}
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-background/60 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas las disciplinas</option>
              {schedule.disciplines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Ubicación</span>
            <select
              name="location"
              defaultValue={selectedLocation?.id ?? ""}
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-background/60 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas las ubicaciones</option>
              {schedule.locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Estado</span>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-background/60 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="scheduled">Programadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="completed">Finalizadas</option>
              <option value="all">Todos los estados</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              aria-label="Aplicar filtros"
              title="Aplicar filtros"
              className="h-10 w-10 shrink-0 px-0"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Link
              href={clearHref}
              aria-label="Limpiar"
              title="Limpiar filtros"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <FilterX aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </form>
      </Surface>

      <section aria-labelledby="sessions-heading" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <nav
            aria-label="Período de visualización"
            className="grid grid-cols-3 rounded-lg border border-border p-0.5"
          >
            {(
              [
                ["day", "Día"],
                ["week", "Semana"],
                ["month", "Mes"],
              ] as const
            ).map(([value, label]) => (
              <Link
                key={value}
                href={displayHref(value)}
                aria-current={period === value ? "page" : undefined}
                className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${period === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          {isCalendar ? null : dateNavigation}
          <nav
            aria-label="Vista de sesiones"
            className="ml-auto flex shrink-0 rounded-lg border border-border p-0.5"
          >
            <Link
              href={viewHref("grid")}
              aria-label="Grid"
              title="Vista Grid"
              aria-current={view === "grid" ? "page" : undefined}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href={viewHref("table")}
              aria-label="Tabla"
              title="Vista de tabla"
              aria-current={view === "table" ? "page" : undefined}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Table2 aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href={viewHref("calendar")}
              aria-label="Calendario"
              title="Vista de calendario"
              aria-current={view === "calendar" ? "page" : undefined}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <CalendarRange aria-hidden="true" className="h-4 w-4" />
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <h2 id="sessions-heading" className="text-base font-bold">
              Sesiones
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedLocation?.name ?? "Todas las ubicaciones"} ·{" "}
              {schedule.total} resultados
            </p>
          </div>
          {isCalendar ? null : pagination}
        </div>
        {isCalendar ? (
          <SessionCalendar
            sessions={calendarSessions}
            period={period}
            date={date}
            today={operationalDateKey(now)}
            range={range}
            title={periodTitle}
            baseQuery={calendarBaseQuery}
            navigation={dateNavigation}
            hiddenCount={Math.max(0, schedule.total - sessions.length)}
          />
        ) : sessions.length > 0 ? (
          view === "table" ? (
            <SessionTable sessions={sessions} now={now} canManage={canManage} />
          ) : (
            <SessionList sessions={sessions} now={now} canManage={canManage} />
          )
        ) : (
          <Surface className="p-5">
            <EmptyState
              title={
                schedule.total === 0
                  ? "No hay sesiones para estos filtros"
                  : "No hay sesiones en esta página"
              }
              description="Cambia la disciplina, el día, el período o el estado para encontrar otras sesiones."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href={clearHref}
                    className={`${actionClass} border-border hover:bg-surface-raised`}
                  >
                    Limpiar filtros
                  </Link>
                  {canManage ? (
                    <Link
                      href="/dashboard/schedule/programming"
                      className={`${actionClass} border-primary bg-primary text-primary-foreground hover:bg-primary/90`}
                    >
                      Programar sesiones
                    </Link>
                  ) : null}
                </div>
              }
            />
          </Surface>
        )}
      </section>
    </div>
  );
}
