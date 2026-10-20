import type { DaySession } from "@/domain/instructor-operations/instructor-day";

export const operationalTimezone = "America/Santiago";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: operationalTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const sessionDateFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: operationalTimezone,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const sessionTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: operationalTimezone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function operationalDateKey(date: Date) {
  return dateKeyFormatter.format(date);
}

export function isSessionCurrent(session: DaySession, now: Date) {
  return session.startsAt <= now && session.endsAt > now;
}

export function sessionOccupiedCount(session: DaySession) {
  return session.confirmedCount + (session.walkInCount ?? 0);
}

export type SessionCalendarState =
  | "upcoming"
  | "current"
  | "full"
  | "completed"
  | "cancelled";

export function sessionCalendarState(
  session: DaySession,
  now: Date,
): SessionCalendarState {
  if (session.status === "cancelled") return "cancelled";
  if (session.status === "completed" || session.endsAt <= now)
    return "completed";
  if (isSessionCurrent(session, now)) return "current";
  if (session.capacity > 0 && sessionOccupiedCount(session) >= session.capacity)
    return "full";
  return "upcoming";
}

export function sessionCapacity(session: DaySession) {
  const occupied = sessionOccupiedCount(session);
  return {
    occupied,
    available: Math.max(0, session.capacity - occupied),
    percent:
      session.capacity > 0
        ? Math.min(
            100,
            Math.max(0, Math.round((occupied / session.capacity) * 100)),
          )
        : 0,
  };
}

/**
 * Groups sessions by their operational date key, sorted ascending within each
 * group. Builds groups in a single pass without pre-sorting the full array.
 */
export function groupSessionsByDate(sessions: DaySession[]) {
  const groups = new Map<string, DaySession[]>();
  for (const session of sessions) {
    const key = operationalDateKey(session.startsAt);
    const group = groups.get(key);
    if (group) group.push(session);
    else groups.set(key, [session]);
  }
  // Sort date keys and each group's sessions in one final pass.
  return [...groups]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, items]) => ({
      date,
      sessions: items.sort(
        (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
      ),
    }));
}
