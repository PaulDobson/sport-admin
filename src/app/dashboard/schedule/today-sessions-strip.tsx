import Link from "next/link";
import { MapPin, Clock, Users, Wifi } from "lucide-react";
import type { DaySession } from "@/domain/instructor-operations/instructor-day";
import {
  sessionCalendarState,
  sessionCapacity,
  sessionTimeFormatter,
  type SessionCalendarState,
} from "./session-presentation";

// ─── Visual config per state ──────────────────────────────────────────────────

interface StateStyle {
  bar: string;
  badge: string;
  label: string;
  trackFill: string;
}

const STATE_STYLES: Record<SessionCalendarState, StateStyle> = {
  current: {
    bar: "bg-success",
    badge: "bg-success/15 text-success border-success/25",
    label: "En curso",
    trackFill: "bg-success",
  },
  upcoming: {
    bar: "bg-primary",
    badge: "bg-primary/15 text-primary border-primary/25",
    label: "Próxima",
    trackFill: "bg-primary",
  },
  full: {
    bar: "bg-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/25",
    label: "Sin cupo",
    trackFill: "bg-destructive",
  },
  completed: {
    bar: "bg-muted-foreground/40",
    badge: "bg-white/6 text-muted-foreground border-white/8",
    label: "Finalizada",
    trackFill: "bg-muted-foreground/40",
  },
  cancelled: {
    bar: "bg-warning/60",
    badge: "bg-warning/12 text-warning border-warning/20",
    label: "Cancelada",
    trackFill: "bg-warning/50",
  },
};

// ─── Session card ─────────────────────────────────────────────────────────────

function TodaySessionCard({
  session,
  now,
  todayKey,
}: {
  session: DaySession;
  now: Date;
  todayKey: string;
}) {
  const state = sessionCalendarState(session, now);
  const style = STATE_STYLES[state];
  const cap = sessionCapacity(session);
  const timeLabel = sessionTimeFormatter.format(session.startsAt);
  const timeEnd = sessionTimeFormatter.format(session.endsAt);
  const isCurrent = state === "current";

  const sessionDayKey = session.startsAt
    .toISOString()
    .slice(0, 10); // used for the link href

  return (
    <article
      className={`relative flex min-w-[220px] max-w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg sm:min-w-[200px] sm:max-w-[220px] ${
        isCurrent
          ? "border-success/30 shadow-md shadow-success/10"
          : "border-white/8 hover:border-white/14"
      }`}
    >
      {/* State color bar */}
      <div className={`h-1 w-full ${style.bar}`} aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        {/* Header: time + badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Clock size={11} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            <span className="metric-number text-xs font-semibold text-foreground">
              {timeLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">– {timeEnd}</span>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}
          >
            {style.label}
          </span>
        </div>

        {/* Session name */}
        <Link
          href={`/dashboard/sessions/${session.id}`}
          className="line-clamp-2 text-sm font-bold leading-tight text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {session.name}
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin size={11} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{session.locationName}</span>
        </div>

        {/* Capacity */}
        {session.capacity > 0 ? (
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users size={11} aria-hidden="true" className="shrink-0" />
                <span>
                  <span className="font-semibold text-foreground">
                    {cap.occupied}
                  </span>
                  /{session.capacity}
                </span>
              </div>
              {session.waitlistedCount > 0 && (
                <span className="text-[10px] text-warning">
                  +{session.waitlistedCount} espera
                </span>
              )}
            </div>
            {/* Capacity bar */}
            <div
              className="h-1.5 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuenow={cap.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${cap.occupied} de ${session.capacity} lugares ocupados`}
            >
              <div
                className={`h-full rounded-full transition-all ${style.trackFill}`}
                style={{ width: `${cap.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <Wifi size={11} aria-hidden="true" className="shrink-0" />
            <span>Sin límite de aforo</span>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface TodaySessionsStripProps {
  /** All sessions returned by the current page query — filtering to today is done here. */
  sessions: DaySession[];
  now: Date;
  todayKey: string;
}

/**
 * Horizontal scrollable strip showing only the sessions that belong to today's
 * operational date, ordered by start time.  Derives state from the already-
 * loaded session data so no extra DB call is needed.
 *
 * Rendered only when today falls within the current schedule view period AND
 * there is at least one session for today.
 */
export function TodaySessionsStrip({
  sessions,
  now,
  todayKey,
}: TodaySessionsStripProps) {
  // Filter and sort in one pass — avoids a separate sort step.
  const todaySessions = sessions
    .filter((s) => {
      // Use the same key logic the page already uses: first 10 chars of the
      // ISO string from the starts_at Date (UTC, so we re-derive the
      // operational date key the same way the rest of the page does).
      const key =
        s.startsAt instanceof Date
          ? new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/Santiago",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(s.startsAt)
          : String(s.startsAt).slice(0, 10);
      return key === todayKey;
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  if (todaySessions.length === 0) return null;

  const currentSession = todaySessions.find(
    (s) =>
      s.status !== "cancelled" &&
      s.status !== "completed" &&
      s.startsAt <= now &&
      s.endsAt > now,
  );

  const upcomingCount = todaySessions.filter((s) => {
    const state = sessionCalendarState(s, now);
    return state === "upcoming" || state === "full";
  }).length;

  const completedCount = todaySessions.filter(
    (s) => sessionCalendarState(s, now) === "completed",
  ).length;

  return (
    <section aria-labelledby="today-strip-heading">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2
            id="today-strip-heading"
            className="text-sm font-bold text-foreground"
          >
            Hoy
          </h2>
          {/* Contextual chips */}
          <div className="flex items-center gap-1.5">
            {currentSession && (
              <span className="flex items-center gap-1 rounded-full border border-success/25 bg-success/12 px-2 py-0.5 text-[10px] font-semibold text-success">
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-success"
                  aria-hidden="true"
                />
                1 en curso
              </span>
            )}
            {upcomingCount > 0 && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {upcomingCount} próxima{upcomingCount !== 1 ? "s" : ""}
              </span>
            )}
            {completedCount > 0 && (
              <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {completedCount} finalizada{completedCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/dashboard/schedule?date=${todayKey}&period=day`}
          className="text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Ver día completo →
        </Link>
      </div>

      {/* Horizontal scroll strip */}
      <div
        className="relative"
        aria-label={`${todaySessions.length} clases programadas para hoy`}
      >
        {/* Fade-out edge hint */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
        />

        <ul
          className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Clases de hoy"
        >
          {todaySessions.map((session) => (
            <li key={session.id} className="contents">
              <TodaySessionCard
                session={session}
                now={now}
                todayKey={todayKey}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
