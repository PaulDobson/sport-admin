import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Filter,
  Gauge,
  Hourglass,
  MapPin,
  UsersRound,
} from "lucide-react";
import type {
  DaySession,
  InstructorDay,
} from "@/domain/instructor-operations/instructor-day";
import { formatMoney } from "@/lib/format-money";
import {
  EmptyState,
  Panel,
  StatCard,
  ToneBadge,
} from "@/presentation/components/primitives";

/** Compact month summary shown only to roles that manage finance. */
export interface DashboardFinanceSummary {
  currency: string;
  collected: number;
  pending: number;
  overdueStudents: number;
  collectionRate: number;
}

const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function participantsOf(session: DaySession) {
  return session.confirmedCount + (session.walkInCount ?? 0);
}

export function occupancyOf(session: DaySession) {
  if (session.capacity <= 0) return 0;
  return Math.min(100, Math.round((participantsOf(session) / session.capacity) * 100));
}

function occupancyTone(percent: number) {
  if (percent >= 100) return "warning" as const;
  if (percent >= 75) return "info" as const;
  return "primary" as const;
}

const barClasses = {
  primary: "bg-primary/70",
  info: "bg-info/80",
  warning: "bg-warning",
} as const;

const badgeClasses = {
  primary: "border-primary/25 bg-primary/10 text-primary",
  info: "border-info/25 bg-info/10 text-info",
  warning: "border-warning/25 bg-warning/10 text-warning",
  neutral: "border-white/8 bg-white/4 text-muted-foreground",
} as const;

function OccupancyChart({
  sessions,
  currentSessionId,
}: {
  sessions: DaySession[];
  currentSessionId?: string;
}) {
  return (
    <div>
      <ol
        aria-label="Barras de ocupación"
        className="flex h-44 items-end gap-2 border-b border-white/6 sm:gap-3"
      >
        {sessions.map((session) => {
          const percent = occupancyOf(session);
          const isCurrent = session.id === currentSessionId;
          const tone = occupancyTone(percent);
          return (
            <li
              key={session.id}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className="metric-number mb-1 text-center text-[10px] font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                {percent}%
              </span>
              <span
                className={`block w-full max-w-14 rounded-t-md transition-[filter] group-hover:brightness-110 ${
                  isCurrent ? "bg-primary shadow-[0_0_24px] shadow-primary/30" : barClasses[tone]
                }`}
                style={{ height: `${Math.max(percent, 4)}%` }}
              />
              <span className="sr-only">
                {session.name}, {timeFormatter.format(session.startsAt)}:{" "}
                {participantsOf(session)} de {session.capacity} cupos
              </span>
            </li>
          );
        })}
      </ol>
      <ol aria-hidden="true" className="mt-2 flex gap-2 sm:gap-3">
        {sessions.map((session) => (
          <li
            key={session.id}
            className={`metric-number min-w-0 flex-1 truncate text-center text-[10px] ${
              session.id === currentSessionId
                ? "font-bold text-primary"
                : "text-muted-foreground"
            }`}
          >
            {timeFormatter.format(session.startsAt)}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <Legend className="bg-primary" label="En curso" />
        <Legend className="bg-primary/70" label="Disponible" />
        <Legend className="bg-info/80" label="Alta demanda" />
        <Legend className="bg-warning" label="Completa" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function UpcomingSessionItem({ session }: { session: DaySession }) {
  const percent = occupancyOf(session);
  const tone = occupancyTone(percent);
  return (
    <li>
      <Link
        href={`/dashboard/sessions/${session.id}/attendance`}
        aria-label={`Asistencia de ${session.name}, ${timeFormatter.format(session.startsAt)}`}
        className="group flex min-h-14 items-center gap-3 rounded-xl border border-white/5 bg-white/2.5 px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <time
          dateTime={session.startsAt.toISOString()}
          className="metric-number w-12 shrink-0 text-sm font-bold text-primary"
        >
          {timeFormatter.format(session.startsAt)}
        </time>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {session.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="truncate">{session.locationName}</span>
          </span>
        </span>
        <span
          className={`metric-number shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeClasses[tone]}`}
        >
          {participantsOf(session)}/{session.capacity}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </Link>
    </li>
  );
}

function LocationsStatus({ day }: { day: InstructorDay }) {
  const sessions = [
    ...(day.currentSession ? [day.currentSession] : []),
    ...day.upcomingSessions,
  ];
  const rows = day.locations.map((location) => {
    const own = sessions.filter((session) => session.locationId === location.id);
    const capacity = own.reduce((total, session) => total + session.capacity, 0);
    const participants = own.reduce(
      (total, session) => total + participantsOf(session),
      0,
    );
    const percent = capacity > 0 ? Math.round((participants / capacity) * 100) : 0;
    return { location, sessions: own.length, percent };
  });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay locaciones registradas.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {rows.map(({ location, sessions: count, percent }) => {
        const tone = count === 0 ? "neutral" : occupancyTone(percent);
        const label =
          count === 0
            ? "Sin sesiones"
            : tone === "warning"
              ? "Completa"
              : tone === "info"
                ? "Alta demanda"
                : "Disponible";
        return (
          <li key={location.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/4 text-muted-foreground">
              <MapPin aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {location.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {count} {count === 1 ? "sesión" : "sesiones"}
                {count > 0 ? ` · ${percent}% ocupación` : ""}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeClasses[tone]}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function FinanceMonth({ finance }: { finance: DashboardFinanceSummary }) {
  return (
    <Panel
      labelledBy="dashboard-finance"
      title="Finanzas del mes"
      description="Cobranza de membresías del mes en curso"
      action={
        <Link
          href="/dashboard/finance"
          className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Ver finanzas
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/4 p-3">
          <dt className="text-xs font-semibold text-muted-foreground">
            Cobrado
          </dt>
          <dd className="metric-number mt-1 text-lg font-bold text-foreground">
            {formatMoney(finance.collected, finance.currency)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/4 p-3">
          <dt className="text-xs font-semibold text-muted-foreground">
            Por cobrar
          </dt>
          <dd className="metric-number mt-1 text-lg font-bold text-foreground">
            {formatMoney(finance.pending, finance.currency)}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {finance.overdueStudents > 0 ? (
          <Link
            href="/dashboard/finance?section=collections&status=past_due"
            className="inline-flex min-h-8 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ToneBadge tone="warning">
              {finance.overdueStudents === 1
                ? "1 alumno en mora"
                : `${finance.overdueStudents} alumnos en mora`}
            </ToneBadge>
          </Link>
        ) : (
          <ToneBadge tone="success">Sin mora</ToneBadge>
        )}
        <span className="text-xs text-muted-foreground">
          {finance.collectionRate} % cobrado
        </span>
      </div>
    </Panel>
  );
}

export function DashboardOverview({
  day,
  location,
  now,
  hero,
  finance,
}: {
  day: InstructorDay;
  location?: string;
  now: Date;
  hero?: ReactNode;
  finance?: DashboardFinanceSummary;
}) {
  const sessions = [
    ...(day.currentSession ? [day.currentSession] : []),
    ...day.upcomingSessions,
  ];
  const capacity = sessions.reduce((total, session) => total + session.capacity, 0);
  const participants = sessions.reduce(
    (total, session) => total + participantsOf(session),
    0,
  );
  const occupancy = capacity > 0 ? Math.round((participants / capacity) * 100) : 0;
  const waitlisted = sessions.reduce(
    (total, session) => total + session.waitlistedCount,
    0,
  );
  const weekdayDate = dateFormatter.format(now);
  const formattedDate = weekdayDate.charAt(0).toUpperCase() + weekdayDate.slice(1);
  const selectedLocation = day.locations.find((item) => item.id === location);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Resumen del día
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
            {formattedDate}
          </p>
        </div>
        <form
          className="flex items-center gap-2 rounded-xl border border-white/6 bg-card p-1.5"
          method="get"
          aria-label="Filtrar jornada"
        >
          <MapPin
            aria-hidden="true"
            className="ml-2 h-4 w-4 shrink-0 text-muted-foreground"
          />
          <label htmlFor="dashboard-location" className="sr-only">
            Locación
          </label>
          <select
            id="dashboard-location"
            name="location"
            defaultValue={location ?? ""}
            className="h-9 min-w-0 flex-1 rounded-lg bg-transparent pr-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-48"
          >
            <option value="">Todas las locaciones</option>
            {day.locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            aria-label="Aplicar"
            title="Aplicar filtro"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Filter aria-hidden="true" className="h-4 w-4" />
          </button>
        </form>
      </div>

      <section
        aria-label="Resumen de jornada"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <StatCard
          label="Alumnos activos"
          value={day.activeStudents}
          note="En la academia"
          accent="primary"
          icon={UsersRound}
        />
        <StatCard
          label="Sesiones abiertas"
          value={sessions.length}
          note={
            day.currentSession
              ? "1 en curso ahora"
              : selectedLocation
                ? selectedLocation.name
                : "Restantes para hoy"
          }
          accent="info"
          icon={CalendarDays}
        />
        <StatCard
          label="Ocupación del día"
          value={`${occupancy}%`}
          note={`${participants} de ${capacity} cupos`}
          accent="success"
          icon={Gauge}
        >
          <div
            role="progressbar"
            aria-label="Ocupación del día"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={occupancy}
            className="h-1.5 overflow-hidden rounded-full bg-white/6"
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-primary to-success"
              style={{ width: `${Math.min(occupancy, 100)}%` }}
            />
          </div>
        </StatCard>
        <StatCard
          label="En espera"
          value={day.pendingEnrollments}
          note={
            waitlisted > 0
              ? `${waitlisted} en lista de espera hoy`
              : "Inscripciones pendientes"
          }
          accent="warning"
          icon={Hourglass}
        />
      </section>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {hero}
          <Panel
            labelledBy="dashboard-occupancy"
            title="Ocupación por sesión"
            description="Cupos usados respecto de la capacidad de cada sesión"
          >
            {sessions.length > 0 ? (
              <OccupancyChart
                sessions={sessions}
                currentSessionId={day.currentSession?.id}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin sesiones para graficar en esta jornada.
              </p>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5 sm:space-y-6">
          {finance ? <FinanceMonth finance={finance} /> : null}
          <Panel
            labelledBy="dashboard-upcoming"
            title="Próximas sesiones"
            description={`${day.upcomingSessions.length} programadas para esta jornada`}
            action={
              <Link
                href="/dashboard/schedule"
                className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Ver agenda
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {day.upcomingSessions.length > 0 ? (
              <ul className="space-y-2">
                {day.upcomingSessions.map((session) => (
                  <UpcomingSessionItem key={session.id} session={session} />
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Sin próximas sesiones"
                description="No hay próximas sesiones para este filtro. Cambia la locación o revisa la agenda."
              />
            )}
          </Panel>

          <Panel
            labelledBy="dashboard-locations"
            title="Estado de locaciones"
            description="Ocupación de las sesiones restantes"
          >
            <LocationsStatus day={day} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
