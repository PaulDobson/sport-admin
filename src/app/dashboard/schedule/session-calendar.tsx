"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type {
  DateClickInfo,
  EventClickInfo,
  EventDisplayInfo,
  EventInput,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import esLocale from "@fullcalendar/react/locales/es";
import {
  ArrowRight,
  CalendarClock,
  CalendarX2,
  Clock3,
  MapPin,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventCalendarViews } from "@/presentation/components/ui/event-calendar-views";
import {
  operationalTimezone,
  type SessionCalendarState,
} from "./session-presentation";

export interface CalendarSession {
  id: string;
  name: string;
  locationName: string;
  startsAt: string;
  endsAt: string;
  /** Operational (America/Santiago) calendar day of `startsAt`. */
  dateKey: string;
  capacity: number;
  occupied: number;
  waitlisted: number;
  state: SessionCalendarState;
}

export type CalendarPeriod = "day" | "week" | "month";

interface SessionCalendarProps {
  sessions: CalendarSession[];
  period: CalendarPeriod;
  date: string;
  today: string;
  range: { from: string; through: string };
  title: string;
  /** Query string with active filters (without `date`/`period`). */
  baseQuery: string;
  navigation: ReactNode;
  /** Sessions in the period that were not loaded because of the page limit. */
  hiddenCount: number;
}

const calendarViews: Record<CalendarPeriod, string> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
};

export const sessionStateMeta: Record<
  SessionCalendarState,
  { label: string; color: string; badgeClass: string; textClass: string }
> = {
  upcoming: {
    label: "Próxima",
    color: "var(--info)",
    badgeClass: "bg-info/15 text-info ring-info/30",
    textClass: "text-info",
  },
  current: {
    label: "En curso",
    color: "var(--success)",
    badgeClass: "bg-success/15 text-success ring-success/30",
    textClass: "text-success",
  },
  full: {
    label: "Cupo completo",
    color: "var(--warning)",
    badgeClass: "bg-warning/15 text-warning ring-warning/30",
    textClass: "text-warning",
  },
  completed: {
    label: "Finalizada",
    color: "var(--muted-foreground)",
    badgeClass: "bg-muted text-muted-foreground ring-border",
    textClass: "text-muted-foreground",
  },
  cancelled: {
    label: "Cancelada",
    color: "var(--destructive)",
    badgeClass: "bg-destructive/15 text-destructive ring-destructive/30",
    textClass: "text-destructive",
  },
};

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: operationalTimezone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const selectedDayFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function dateKeyOf(date: Date) {
  // FullCalendar emits UTC-coerced dates when a named time zone is set.
  return date.toISOString().slice(0, 10);
}

function initialSelectedDate(
  period: CalendarPeriod,
  date: string,
  today: string,
  range: { from: string; through: string },
) {
  if (period === "day") return date;
  if (today >= range.from && today <= range.through) return today;
  return date >= range.from && date <= range.through ? date : range.from;
}

/**
 * Extracts the UTC hour from an ISO 8601 string without constructing a Date
 * object. FullCalendar passes UTC-coerced ISO strings when a named timezone
 * is configured, so the UTC hour is the operational hour.
 * "2024-03-15T14:30:00.000Z" → 14
 */
function isoHour(iso: string): number {
  return Number(iso.slice(11, 13));
}

/**
 * Extracts the UTC minutes from an ISO 8601 string without constructing a Date.
 * "2024-03-15T14:30:00.000Z" → 30
 */
function isoMinutes(iso: string): number {
  return Number(iso.slice(14, 16));
}

function visibleHours(sessions: CalendarSession[]) {
  let first = 7;
  let last = 22;
  for (const session of sessions) {
    // Avoid constructing Date objects just to read the hour — parse the ISO
    // string directly. FullCalendar emits UTC-coerced strings.
    const startHour = isoHour(session.startsAt);
    first = Math.min(first, startHour);
    const endHour = isoHour(session.endsAt);
    const endMin = isoMinutes(session.endsAt);
    last = Math.max(last, endMin > 0 ? endHour + 1 : endHour);
  }
  const pad = (hour: number) =>
    `${String(Math.min(24, Math.max(0, hour))).padStart(2, "0")}:00:00`;
  return { min: pad(first - 1), max: pad(last + 1), scroll: pad(first) };
}

function renderEventContent(info: EventDisplayInfo) {
  const session = info.event.extendedProps.session as CalendarSession;
  if (!info.view.type.startsWith("timeGrid")) {
    return (
      <>
        <span className="ps-1.5 font-mono text-[0.6875rem] tabular-nums text-muted-foreground whitespace-nowrap">
          {info.timeText}
        </span>
        <span
          className={cn(
            "min-w-0 truncate px-1 font-semibold",
            session.state === "cancelled" && "line-through opacity-70",
          )}
        >
          {session.name}
        </span>
      </>
    );
  }
  return (
    <div
      className={cn(
        "flex h-full min-w-0 overflow-hidden text-foreground",
        info.isShort
          ? "flex-row items-center gap-1.5 px-1.5"
          : "flex-col gap-0.5 px-2 py-1",
      )}
    >
      <span className="shrink-0 font-mono text-[0.6875rem] font-semibold tabular-nums text-(--fc-event-color)">
        {info.timeText}
      </span>
      <span
        className={cn(
          "truncate text-xs font-bold",
          session.state === "cancelled" && "line-through opacity-70",
        )}
      >
        {session.name}
      </span>
      {!info.isShort ? (
        <span className="truncate text-[0.6875rem] text-muted-foreground">
          {session.locationName} · {session.occupied}/{session.capacity}
        </span>
      ) : null}
    </div>
  );
}

export function SessionCalendar({
  sessions,
  period,
  date,
  today,
  range,
  title,
  baseQuery,
  navigation,
  hiddenCount,
}: SessionCalendarProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() =>
    initialSelectedDate(period, date, today, range),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hrefFor = useCallback(
    (nextPeriod: CalendarPeriod, nextDate: string) => {
      const query = new URLSearchParams(baseQuery);
      query.set("period", nextPeriod);
      query.set("date", nextDate);
      return `/dashboard/schedule?${query.toString()}`;
    },
    [baseQuery],
  );

  const events = useMemo<EventInput[]>(
    () =>
      sessions.map((session) => ({
        id: session.id,
        title: session.name,
        start: session.startsAt,
        end: session.endsAt,
        color: sessionStateMeta[session.state].color,
        extendedProps: { session },
      })),
    [sessions],
  );

  const hours = useMemo(() => visibleHours(sessions), [sessions]);

  // Single-pass filter + sort: collect matching sessions and sort by ISO string
  // comparison (lexicographic ordering of ISO dates is identical to time order).
  const daySessions = useMemo(() => {
    const result: CalendarSession[] = [];
    for (const session of sessions) {
      if (session.dateKey === selectedDate) result.push(session);
    }
    return result.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [sessions, selectedDate]);

  const selectDate = useCallback(
    (dateKey: string) => {
      if (dateKey < range.from || dateKey > range.through) {
        router.push(hrefFor(period, dateKey));
        return;
      }
      setSelectedDate(dateKey);
      setSelectedId(null);
    },
    [hrefFor, period, range.from, range.through, router],
  );

  const handleDateClick = useCallback(
    (info: DateClickInfo) => selectDate(info.dateStr.slice(0, 10)),
    [selectDate],
  );

  const handleEventClick = useCallback((info: EventClickInfo) => {
    info.jsEvent.preventDefault();
    const session = info.event.extendedProps.session as CalendarSession;
    setSelectedDate(session.dateKey);
    setSelectedId(session.id);
    requestAnimationFrame(() =>
      document
        .getElementById(`calendar-session-${session.id}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    );
  }, []);

  const handleNavLinkDay = useCallback(
    (day: Date) => router.push(hrefFor("day", dateKeyOf(day))),
    [hrefFor, router],
  );

  const selectedLabel = selectedDayFormatter.format(
    new Date(`${selectedDate}T12:00:00Z`),
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section
        aria-labelledby="calendar-title"
        className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-lg shadow-black/10 sm:p-5"
      >
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3
            id="calendar-title"
            className="text-xl font-bold tracking-tight first-letter:uppercase sm:text-2xl"
          >
            {title}
          </h3>
          <div className="flex items-center">{navigation}</div>
        </header>
        {hiddenCount > 0 ? (
          <p
            role="status"
            className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
          >
            Hay {hiddenCount} sesiones más en este período que no se muestran.
            Usa los filtros o cambia a la vista de semana o día.
          </p>
        ) : null}
        <div>
          <EventCalendarViews
            key={`${period}:${date}`}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={calendarViews[period]}
            initialDate={date}
            locale={esLocale}
            timeZone={operationalTimezone}
            firstDay={1}
            headerToolbar={false}
            events={events}
            height={period === "month" ? "auto" : 720}
            fixedWeekCount={false}
            dayMaxEvents={3}
            navLinks
            navLinkDayClick={handleNavLinkDay}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            allDaySlot={false}
            nowIndicator
            slotMinTime={hours.min}
            slotMaxTime={hours.max}
            scrollTime={hours.scroll}
            slotDuration="00:30:00"
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            slotHeaderFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            selectedDate={period === "day" ? undefined : selectedDate}
            eventContent={renderEventContent}
            popoverCloseContent={() => (
              <X aria-hidden="true" className="size-4" />
            )}
          />
        </div>
        <ul
          aria-label="Leyenda de estados"
          className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
        >
          {Object.entries(sessionStateMeta).map(([state, meta]) => (
            <li key={state} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
            </li>
          ))}
        </ul>
      </section>

      <aside
        aria-labelledby="calendar-day-heading"
        className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10 xl:sticky xl:top-4"
      >
        <div>
          <h3 id="calendar-day-heading" className="text-lg font-bold">
            {selectedDate === today ? "Sesiones de hoy" : "Sesiones del día"}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground first-letter:uppercase">
            {selectedLabel} · {daySessions.length}{" "}
            {daySessions.length === 1 ? "sesión" : "sesiones"}
          </p>
        </div>

        {daySessions.length > 0 ? (
          <ol className="flex max-h-[calc(100vh-16rem)] flex-col gap-2.5 overflow-y-auto pe-1">
            {daySessions.map((session) => {
              const meta = sessionStateMeta[session.state];
              const percent =
                session.capacity > 0
                  ? Math.min(
                      100,
                      Math.round((session.occupied / session.capacity) * 100),
                    )
                  : 0;
              // Parse ISO strings once per session. timeFormatter.format()
              // requires a Date, so we construct them here rather than
              // duplicating the parse in every format() call.
              const startDate = new Date(session.startsAt);
              const endDate = new Date(session.endsAt);
              return (
                <li
                  key={session.id}
                  id={`calendar-session-${session.id}`}
                  aria-current={selectedId === session.id ? "true" : undefined}
                  className={cn(
                    "rounded-xl border bg-background/40 p-3.5 transition-colors",
                    selectedId === session.id
                      ? "border-primary/70 ring-1 ring-primary/40"
                      : "border-border/70 hover:border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-md px-2 py-1 font-mono text-xs font-bold tabular-nums ring-1",
                        meta.badgeClass,
                      )}
                    >
                      <time dateTime={session.startsAt}>
                        {timeFormatter.format(startDate)}
                      </time>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-semibold",
                          session.state === "cancelled" &&
                            "line-through opacity-70",
                        )}
                      >
                        {session.name}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin
                            aria-hidden="true"
                            className="size-3 shrink-0"
                          />
                          <span className="truncate">
                            {session.locationName}
                          </span>
                        </span>
                        <span aria-hidden="true">•</span>
                        <span className={meta.textClass}>{meta.label}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock3 aria-hidden="true" className="size-3.5" />
                      {timeFormatter.format(startDate)}–
                      {timeFormatter.format(endDate)}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <UsersRound aria-hidden="true" className="size-3.5" />
                      {session.occupied}/{session.capacity}
                      {session.waitlisted > 0
                        ? ` · ${session.waitlisted} en espera`
                        : ""}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`Ocupación de ${session.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                  {session.state !== "cancelled" ? (
                    <Link
                      href={`/dashboard/sessions/${session.id}/attendance`}
                      aria-label={`Tomar asistencia de ${session.name}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Tomar asistencia
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <CalendarX2
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
            <p className="text-sm font-semibold">Sin sesiones este día</p>
            <p className="text-xs text-muted-foreground">
              Selecciona otro día en el calendario para ver sus sesiones.
            </p>
          </div>
        )}

        {period !== "day" ? (
          <Link
            href={hrefFor("day", selectedDate)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CalendarClock aria-hidden="true" className="size-4" />
            Ver agenda del día
          </Link>
        ) : null}
      </aside>
    </div>
  );
}
