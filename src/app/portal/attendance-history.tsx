"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock4,
  Dumbbell,
  MapPin,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type { StudentPortalAttendanceRecord } from "@/application/student-portal/ports/student-portal-port";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const DATE_LONG = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const MONTH_YEAR = new Intl.DateTimeFormat("es-CL", {
  month: "long",
  year: "numeric",
});

function durationMinutes(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Attendance badge
// ---------------------------------------------------------------------------

type AttStatus = "present" | "late" | "absent" | null;

const STATUS_CONFIG: Record<
  NonNullable<AttStatus> | "none",
  { label: string; icon: typeof CheckCircle2; classes: string; dot: string }
> = {
  present: {
    label: "Presente",
    icon: CheckCircle2,
    classes: "bg-success/12 text-success ring-success/20",
    dot: "bg-success",
  },
  late: {
    label: "Tarde",
    icon: Clock4,
    classes: "bg-warning/12 text-warning ring-warning/20",
    dot: "bg-warning",
  },
  absent: {
    label: "Ausente",
    icon: XCircle,
    classes: "bg-destructive/12 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  none: {
    label: "Sin registro",
    icon: MinusCircle,
    classes: "bg-white/6 text-muted-foreground ring-white/8",
    dot: "bg-muted-foreground/40",
  },
};

function AttendanceBadge({ status }: { status: AttStatus }) {
  const key = status ?? "none";
  const cfg = STATUS_CONFIG[key];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${cfg.classes}`}
    >
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single attendance row
// ---------------------------------------------------------------------------

function AttendanceRow({ record }: { record: StudentPortalAttendanceRecord }) {
  const duration = durationMinutes(record.startsAt, record.endsAt);
  const key = record.attendanceStatus ?? "none";
  const dot = STATUS_CONFIG[key].dot;

  return (
    <li className="flex items-start gap-4 py-4">
      {/* Timeline dot + line */}
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden="true"
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background ${dot}`}
        />
        <span aria-hidden="true" className="mt-1 w-px flex-1 bg-white/8" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {record.className}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <time dateTime={record.startsAt.toISOString()}>
                {DATE_LONG.format(record.startsAt)}
              </time>
              {" · "}
              {TIME_FMT.format(record.startsAt)}
              {" · "}
              {formatDuration(duration)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
              {record.locationName}
            </p>
          </div>
          <AttendanceBadge status={record.attendanceStatus} />
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Month group
// ---------------------------------------------------------------------------

function MonthGroup({
  label,
  records,
  defaultOpen,
}: {
  label: string;
  records: StudentPortalAttendanceRecord[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const presentCount = records.filter(
    (r) => r.attendanceStatus === "present",
  ).length;
  const lateCount = records.filter((r) => r.attendanceStatus === "late").length;
  const absentCount = records.filter(
    (r) => r.attendanceStatus === "absent",
  ).length;
  const noRecordCount = records.filter(
    (r) => r.attendanceStatus === null,
  ).length;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-surface-raised"
      >
        <div className="flex items-center gap-2.5">
          <CalendarDays
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-primary"
          />
          <span className="text-sm font-bold capitalize text-foreground">
            {label}
          </span>
          <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {records.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mini stats */}
          {presentCount > 0 && (
            <span className="hidden items-center gap-1 text-[11px] font-semibold text-success sm:flex">
              <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
              {presentCount}
            </span>
          )}
          {lateCount > 0 && (
            <span className="hidden items-center gap-1 text-[11px] font-semibold text-warning sm:flex">
              <Clock4 aria-hidden="true" className="h-3 w-3" />
              {lateCount}
            </span>
          )}
          {absentCount > 0 && (
            <span className="hidden items-center gap-1 text-[11px] font-semibold text-destructive sm:flex">
              <XCircle aria-hidden="true" className="h-3 w-3" />
              {absentCount}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <ul
          aria-label={`Sesiones de ${label}`}
          className="ml-1 mt-1 border-l border-white/8 pl-4"
        >
          {records.map((record) => (
            <AttendanceRow key={record.sessionId} record={record} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------

function SummaryBar({ records }: { records: StudentPortalAttendanceRecord[] }) {
  const total = records.length;
  if (total === 0) return null;

  const present = records.filter(
    (r) => r.attendanceStatus === "present",
  ).length;
  const late = records.filter((r) => r.attendanceStatus === "late").length;
  const absent = records.filter((r) => r.attendanceStatus === "absent").length;
  const noRecord = records.filter((r) => r.attendanceStatus === null).length;
  const attended = present + late; // "showed up"
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/8 bg-card p-4 sm:p-5">
      {/* Headline */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Asistencia total
          </p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums text-foreground">
            {pct}%
          </p>
        </div>
        <p className="text-right text-sm text-muted-foreground">
          {attended} de {total} clases
        </p>
      </div>

      {/* Progress bar */}
      <div
        aria-label={`${pct}% de asistencia`}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-4 h-2 overflow-hidden rounded-full bg-white/8"
      >
        <div
          aria-hidden="true"
          className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            label: "Presente",
            count: present,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Tarde",
            count: late,
            color: "text-warning",
            bg: "bg-warning/10",
          },
          {
            label: "Ausente",
            count: absent,
            color: "text-destructive",
            bg: "bg-destructive/10",
          },
          {
            label: "Sin registro",
            count: noRecord,
            color: "text-muted-foreground",
            bg: "bg-white/5",
          },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`rounded-xl px-3 py-2.5 ${bg}`}>
            <p className={`text-lg font-bold tabular-nums ${color}`}>{count}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function AttendanceHistory({
  records,
}: {
  records: StudentPortalAttendanceRecord[];
}) {
  // Group by month (year-month key, descending)
  const groups = useMemo(() => {
    const map = new Map<string, StudentPortalAttendanceRecord[]>();
    for (const r of records) {
      const key = `${r.startsAt.getFullYear()}-${String(r.startsAt.getMonth() + 1).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    // Sort records within each month descending
    for (const arr of map.values()) {
      arr.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
    }
    // Return entries sorted newest-first
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Dumbbell aria-hidden="true" className="h-7 w-7" />
        </div>
        <p className="text-base font-bold">Aún no hay asistencias</p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Aquí aparecerán las clases a las que hayas asistido una vez que el
          instructor registre la asistencia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <SummaryBar records={records} />

      {/* Month groups */}
      <div className="space-y-2">
        {groups.map(([key, monthRecords], i) => {
          const [year, month] = key.split("-").map(Number);
          const date = new Date(year, month - 1, 1);
          return (
            <MonthGroup
              key={key}
              label={MONTH_YEAR.format(date)}
              records={monthRecords}
              defaultOpen={i === 0}
            />
          );
        })}
      </div>
    </div>
  );
}
