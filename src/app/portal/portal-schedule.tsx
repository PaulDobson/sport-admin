"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  UsersRound,
} from "lucide-react";
import type { StudentPortalSession } from "@/application/student-portal/ports/student-portal-port";
import { SessionEnrollmentForm } from "./session-enrollment-form";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const SHORT_DAY = new Intl.DateTimeFormat("es-CL", { weekday: "short" });
const LONG_DAY = new Intl.DateTimeFormat("es-CL", { weekday: "long" });
const LONG_DATE = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const MONTH_DAY = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
});
const TIME_FMT = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function startOfLocalDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function canCancel(startsAt: Date): boolean {
  return startsAt.getTime() - Date.now() > 60 * 60 * 1000;
}

function isFuture(startsAt: Date): boolean {
  return startsAt.getTime() > Date.now();
}

/**
 * Given today and a week's sessions map, return the timestamp of the best
 * default day to select: today if it has sessions, otherwise the first
 * upcoming day this week that has sessions, otherwise today.
 */
function pickDefaultDay(
  today: Date,
  days: Date[],
  sessionsByDay: Map<number, StudentPortalSession[]>,
): number {
  const todayTs = startOfLocalDay(today);
  if ((sessionsByDay.get(todayTs)?.length ?? 0) > 0) return todayTs;
  for (const d of days) {
    const ts = startOfLocalDay(d);
    if (ts >= todayTs && (sessionsByDay.get(ts)?.length ?? 0) > 0) return ts;
  }
  return todayTs;
}

// ---------------------------------------------------------------------------
// Capacity bar
// ---------------------------------------------------------------------------

function CapacityBar({
  confirmed,
  capacity,
}: {
  confirmed: number;
  capacity: number;
}) {
  const pct = capacity > 0 ? Math.min(confirmed / capacity, 1) : 0;
  const tone =
    pct >= 1 ? "bg-destructive" : pct >= 0.75 ? "bg-warning" : "bg-success";
  return (
    <div
      aria-hidden="true"
      className="h-1 w-14 overflow-hidden rounded-full bg-white/10"
    >
      <div
        className={`h-full rounded-full transition-all ${tone}`}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------

export function SessionCard({ session }: { session: StudentPortalSession }) {
  const past = !isFuture(session.startsAt);
  const enrolled = session.enrollmentStatus === "confirmed";
  const waitlisted = session.enrollmentStatus === "waitlisted";
  const full =
    session.confirmedCount >= session.capacity && !session.waitlistEnabled;
  const cancelDeadlinePassed =
    (enrolled || waitlisted) && !canCancel(session.startsAt);
  const duration = durationMinutes(session.startsAt, session.endsAt);

  return (
    <article
      className={[
        "relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5",
        enrolled
          ? "border-success/25 bg-success/5"
          : waitlisted
            ? "border-warning/25 bg-warning/5"
            : past
              ? "border-white/5 bg-white/[0.02] opacity-50"
              : "border-white/8 bg-card",
      ].join(" ")}
      aria-label={session.className}
    >
      {/* Time column */}
      <div className="flex shrink-0 flex-row items-center gap-3 sm:w-24 sm:flex-col sm:items-start sm:gap-1">
        <time
          dateTime={session.startsAt.toISOString()}
          className="tabular-nums text-lg font-bold leading-none"
        >
          {TIME_FMT.format(session.startsAt)}
        </time>
        <span className="text-xs text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Vertical divider — desktop */}
      <div
        aria-hidden="true"
        className="hidden w-px shrink-0 self-stretch bg-white/8 sm:block"
      />

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* Class name + status badge */}
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-bold leading-snug">
            {session.className}
          </h3>
          {enrolled ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success ring-1 ring-success/25">
              <Check aria-hidden="true" className="h-3 w-3" />
              Reservada
            </span>
          ) : waitlisted ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-bold text-warning ring-1 ring-warning/25">
              <Clock aria-hidden="true" className="h-3 w-3" />
              En espera
            </span>
          ) : null}
        </div>

        {/* Meta row */}
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Ubicación</dt>
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <dd>{session.locationName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Cupos</dt>
            <UsersRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <dd className="flex items-center gap-2 tabular-nums">
              <span>
                {session.confirmedCount}/{session.capacity}
              </span>
              <CapacityBar
                confirmed={session.confirmedCount}
                capacity={session.capacity}
              />
            </dd>
          </div>
          {session.waitlistedCount > 0 && (
            <div className="flex items-center gap-1.5 text-warning">
              <dt className="sr-only">En lista de espera</dt>
              <dd className="text-xs font-semibold">
                +{session.waitlistedCount} en espera
              </dd>
            </div>
          )}
        </dl>

        {/* Action */}
        {past ? (
          <p className="text-xs text-muted-foreground">Sesión finalizada</p>
        ) : cancelDeadlinePassed ? (
          <p className="text-xs text-muted-foreground">
            Plazo de cancelación vencido
          </p>
        ) : full && !enrolled && !waitlisted ? (
          <p className="text-xs font-semibold text-muted-foreground">
            Sesión completa
          </p>
        ) : (
          <SessionEnrollmentForm session={session} />
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Desktop sidebar: week + day list
// ---------------------------------------------------------------------------

function WeekSidebar({
  days,
  activeDayTs,
  sessionsByDay,
  todayTs,
  weekOffset,
  onSelectDay,
  onWeekChange,
  onGoToToday,
}: {
  days: Date[];
  activeDayTs: number;
  sessionsByDay: Map<number, StudentPortalSession[]>;
  todayTs: number;
  weekOffset: number;
  onSelectDay: (ts: number) => void;
  onWeekChange: (dir: -1 | 1) => void;
  onGoToToday: () => void;
}) {
  return (
    <aside
      className="flex w-52 shrink-0 flex-col gap-1"
      aria-label="Días de la semana"
    >
      {/* Week header */}
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onWeekChange(-1)}
          disabled={weekOffset <= 0}
          aria-label="Semana anterior"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>

        <p className="flex-1 text-center text-xs font-bold text-muted-foreground">
          {weekOffset === 0
            ? "Esta semana"
            : weekOffset === 1
              ? "Próxima semana"
              : weekOffset === -1
                ? "Sem. pasada"
                : `Sem. +${weekOffset}`}
        </p>

        <button
          type="button"
          onClick={() => onWeekChange(1)}
          aria-label="Semana siguiente"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {/* Day buttons */}
      {days.map((day) => {
        const ts = startOfLocalDay(day);
        const isActive = ts === activeDayTs;
        const isToday = ts === todayTs;
        const daySessions = sessionsByDay.get(ts) ?? [];
        const enrolledCount = daySessions.filter(
          (s) =>
            s.enrollmentStatus === "confirmed" ||
            s.enrollmentStatus === "waitlisted",
        ).length;

        return (
          <button
            key={ts}
            type="button"
            onClick={() => onSelectDay(ts)}
            aria-pressed={isActive}
            aria-label={`${LONG_DAY.format(day)}, ${MONTH_DAY.format(day)}`}
            className={[
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
              isActive
                ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
            ].join(" ")}
          >
            {/* Day number circle */}
            <span
              className={[
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "bg-primary/20 text-primary"
                    : "bg-white/6 text-foreground",
              ].join(" ")}
            >
              {day.getDate()}
            </span>

            {/* Day name + session count */}
            <span className="min-w-0 flex-1">
              <span
                className={[
                  "block text-sm font-semibold capitalize",
                  isToday && !isActive ? "text-primary" : "",
                ].join(" ")}
              >
                {SHORT_DAY.format(day)}
                {isToday ? (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide opacity-70">
                    hoy
                  </span>
                ) : null}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {daySessions.length > 0
                  ? `${daySessions.length} clase${daySessions.length !== 1 ? "s" : ""}`
                  : "Sin clases"}
              </span>
            </span>

            {/* Enrollment badge */}
            {enrolledCount > 0 ? (
              <span
                aria-label={`${enrolledCount} reservada${enrolledCount !== 1 ? "s" : ""}`}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/20 text-[10px] font-bold tabular-nums text-success"
              >
                {enrolledCount}
              </span>
            ) : null}
          </button>
        );
      })}

      {/* Jump to today */}
      {weekOffset !== 0 ? (
        <button
          type="button"
          onClick={onGoToToday}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
          Ir a hoy
        </button>
      ) : null}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile day pill strip
// ---------------------------------------------------------------------------

function DayPillStrip({
  days,
  activeDayTs,
  sessionsByDay,
  todayTs,
  onSelect,
}: {
  days: Date[];
  activeDayTs: number;
  sessionsByDay: Map<number, StudentPortalSession[]>;
  todayTs: number;
  onSelect: (ts: number) => void;
}) {
  return (
    <nav
      aria-label="Navegar por día"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {days.map((day) => {
        const ts = startOfLocalDay(day);
        const isActive = ts === activeDayTs;
        const isToday = ts === todayTs;
        const count = sessionsByDay.get(ts)?.length ?? 0;

        return (
          <button
            key={ts}
            type="button"
            onClick={() => onSelect(ts)}
            aria-pressed={isActive}
            aria-label={`${LONG_DAY.format(day)}, ${MONTH_DAY.format(day)}`}
            className={[
              "relative flex min-w-[3.25rem] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2.5 py-2.5 text-xs font-semibold transition-colors",
              isActive
                ? "border-primary bg-primary/15 text-primary"
                : isToday
                  ? "border-primary/35 bg-primary/5 text-primary/80"
                  : "border-white/8 bg-white/[0.03] text-muted-foreground hover:bg-surface-raised hover:text-foreground",
            ].join(" ")}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {SHORT_DAY.format(day)}
            </span>
            <span className="tabular-nums text-sm font-bold">
              {day.getDate()}
            </span>
            {/* Session presence dot */}
            <span
              aria-hidden="true"
              className={[
                "mt-0.5 h-1.5 w-1.5 rounded-full",
                count > 0
                  ? isActive
                    ? "bg-primary"
                    : "bg-white/30"
                  : "opacity-0",
              ].join(" ")}
            />
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Day detail panel — shared by mobile and desktop
// ---------------------------------------------------------------------------

function DayDetail({
  date,
  sessions,
  isToday,
}: {
  date: Date;
  sessions: StudentPortalSession[];
  isToday: boolean;
}) {
  return (
    <section aria-label={LONG_DAY.format(date)} className="min-w-0 flex-1">
      <header className="mb-5 flex items-baseline gap-3">
        <h2
          className={[
            "text-lg font-bold capitalize",
            isToday ? "text-primary" : "text-foreground",
          ].join(" ")}
        >
          {LONG_DATE.format(date)}
        </h2>
        {isToday ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            Hoy
          </span>
        ) : null}
        <span className="ml-auto text-sm text-muted-foreground">
          {sessions.length > 0
            ? `${sessions.length} clase${sessions.length !== 1 ? "s" : ""}`
            : ""}
        </span>
      </header>

      {sessions.length > 0 ? (
        <ol className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionCard session={session} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-muted-foreground">
            <CalendarDays aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="font-semibold text-muted-foreground">
            Sin clases este día
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Selecciona otro día para ver la agenda
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

const DAYS_IN_WEEK = 7;

export function PortalSchedule({
  sessions,
}: {
  sessions: StudentPortalSession[];
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build the sessions-by-day map once from the initial sessions list.
  // We need it before state initialisation to pick the best default day.
  const initialSessionsByDay = useMemo(() => {
    const map = new Map<number, StudentPortalSession[]>();
    for (const s of sessions) {
      const key = startOfLocalDay(s.startsAt);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sessions]);

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => addDays(today, weekOffset * DAYS_IN_WEEK),
    [today, weekOffset],
  );

  const days = useMemo(
    () => Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Default to the first day this week that has sessions; fall back to today.
  const [activeDayTs, setActiveDayTs] = useState(() =>
    pickDefaultDay(
      today,
      Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(today, i)),
      initialSessionsByDay,
    ),
  );

  const handleWeekChange = (dir: -1 | 1) => {
    const nextOffset = weekOffset + dir;
    setWeekOffset(nextOffset);
    const nextStart = addDays(today, nextOffset * DAYS_IN_WEEK);
    const nextDays = Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
      addDays(nextStart, i),
    );
    setActiveDayTs(pickDefaultDay(nextStart, nextDays, initialSessionsByDay));
  };

  const goToToday = () => {
    setWeekOffset(0);
    const thisWeekDays = Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
      addDays(today, i),
    );
    setActiveDayTs(pickDefaultDay(today, thisWeekDays, initialSessionsByDay));
  };

  // Re-sort sessions for rendering (same map, sorted per-day)
  const sessionsByDay = useMemo(() => {
    const map = new Map<number, StudentPortalSession[]>();
    for (const s of sessions) {
      const key = startOfLocalDay(s.startsAt);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    }
    return map;
  }, [sessions]);

  const todayTs = startOfLocalDay(today);
  const activeDay =
    days.find((d) => startOfLocalDay(d) === activeDayTs) ?? days[0];
  const activeSessions = sessionsByDay.get(activeDayTs) ?? [];

  const weekSessionCount = days.reduce(
    (n, d) => n + (sessionsByDay.get(startOfLocalDay(d))?.length ?? 0),
    0,
  );
  const weekEnrolledCount = days.reduce(
    (n, d) =>
      n +
      (sessionsByDay.get(startOfLocalDay(d)) ?? []).filter(
        (s) =>
          s.enrollmentStatus === "confirmed" ||
          s.enrollmentStatus === "waitlisted",
      ).length,
    0,
  );

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Tu agenda
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <h2 className="text-xl font-bold">
            {weekOffset === 0
              ? "Esta semana"
              : weekOffset === 1
                ? "Próxima semana"
                : weekOffset === -1
                  ? "Semana pasada"
                  : `${MONTH_DAY.format(weekStart)} – ${MONTH_DAY.format(days[6])}`}
          </h2>
          {weekSessionCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {weekSessionCount} sesión{weekSessionCount !== 1 ? "es" : ""}
              {weekEnrolledCount > 0
                ? ` · ${weekEnrolledCount} reservada${weekEnrolledCount !== 1 ? "s" : ""}`
                : ""}
            </p>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* MOBILE (< lg)                                                        */}
      {/* ================================================================== */}
      <div className="space-y-4 lg:hidden">
        {/* Week nav */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleWeekChange(-1)}
            disabled={weekOffset <= 0}
            aria-label="Semana anterior"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>

          {weekOffset !== 0 ? (
            <button
              type="button"
              onClick={goToToday}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
              Hoy
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => handleWeekChange(1)}
            aria-label="Semana siguiente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Day pills */}
        <DayPillStrip
          days={days}
          activeDayTs={activeDayTs}
          sessionsByDay={sessionsByDay}
          todayTs={todayTs}
          onSelect={setActiveDayTs}
        />

        {/* Sessions for active day */}
        <DayDetail
          date={activeDay}
          sessions={activeSessions}
          isToday={activeDayTs === todayTs}
        />
      </div>

      {/* ================================================================== */}
      {/* DESKTOP (≥ lg): sidebar + detail                                     */}
      {/* ================================================================== */}
      <div className="hidden lg:flex lg:gap-6">
        <WeekSidebar
          days={days}
          activeDayTs={activeDayTs}
          sessionsByDay={sessionsByDay}
          todayTs={todayTs}
          weekOffset={weekOffset}
          onSelectDay={setActiveDayTs}
          onWeekChange={handleWeekChange}
          onGoToToday={goToToday}
        />

        <div
          aria-hidden="true"
          className="w-px shrink-0 self-stretch bg-white/8"
        />

        <DayDetail
          date={activeDay}
          sessions={activeSessions}
          isToday={activeDayTs === todayTs}
        />
      </div>
    </div>
  );
}
