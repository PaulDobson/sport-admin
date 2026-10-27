import Link from "next/link";
import {
  CheckCircle2,
  Clock4,
  Dumbbell,
  MapPin,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type {
  StudentAttendanceMonthSummary,
  StudentAttendanceRecord,
} from "@/application/evolution-health-attendance/ports/attendance-repository-port";

// ---------------------------------------------------------------------------
// Formatters — pure server component, no hydration risk
// ---------------------------------------------------------------------------

const DATE_FMT = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const MONTH_SHORT = new Intl.DateTimeFormat("es-CL", {
  month: "short",
  year: "numeric",
});

const MONTH_LONG = new Intl.DateTimeFormat("es-CL", {
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
// Status config
// ---------------------------------------------------------------------------

type AttStatus = "present" | "late" | "absent" | "excused";

const STATUS: Record<
  AttStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    pill: string;
    dot: string;
    bar: string;
  }
> = {
  present: {
    label: "Presente",
    icon: CheckCircle2,
    pill: "bg-success/12 text-success ring-1 ring-success/20",
    dot: "bg-success",
    bar: "bg-success",
  },
  late: {
    label: "Tarde",
    icon: Clock4,
    pill: "bg-warning/12 text-warning ring-1 ring-warning/20",
    dot: "bg-warning",
    bar: "bg-warning",
  },
  absent: {
    label: "Ausente",
    icon: XCircle,
    pill: "bg-destructive/12 text-destructive ring-1 ring-destructive/20",
    dot: "bg-destructive",
    bar: "bg-destructive",
  },
  excused: {
    label: "Justificado",
    icon: MinusCircle,
    pill: "bg-info/12 text-info ring-1 ring-info/20",
    dot: "bg-info",
    bar: "bg-info",
  },
};

function StatusPill({ status }: { status: AttStatus }) {
  const cfg = STATUS[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.pill}`}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Overall summary strip (computed from monthly summaries — cheap)
// ---------------------------------------------------------------------------

function OverallSummary({
  months,
}: {
  months: StudentAttendanceMonthSummary[];
}) {
  const total = months.reduce((n, m) => n + Number(m.total), 0);
  const present = months.reduce((n, m) => n + Number(m.present), 0);
  const late = months.reduce((n, m) => n + Number(m.late), 0);
  const absent = months.reduce((n, m) => n + Number(m.absent), 0);
  const excused = months.reduce((n, m) => n + Number(m.excused), 0);
  const attended = present + late;
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/8 bg-card p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Asistencia total
          </p>
          <p className="metric-number mt-0.5 text-3xl font-extrabold">{pct}%</p>
        </div>
        <p className="text-right text-sm text-muted-foreground">
          {attended} de {total} clases · {months.length} mes
          {months.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* Stacked progress bar */}
      <div
        role="meter"
        aria-label={`${pct}% de asistencia`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/8"
      >
        {total > 0 && (
          <>
            <div
              aria-hidden="true"
              className="h-full bg-success transition-all"
              style={{ width: `${(present / total) * 100}%` }}
            />
            <div
              aria-hidden="true"
              className="h-full bg-warning transition-all"
              style={{ width: `${(late / total) * 100}%` }}
            />
            <div
              aria-hidden="true"
              className="h-full bg-destructive/70 transition-all"
              style={{ width: `${(absent / total) * 100}%` }}
            />
            <div
              aria-hidden="true"
              className="h-full bg-info/70 transition-all"
              style={{ width: `${(excused / total) * 100}%` }}
            />
          </>
        )}
      </div>

      {/* Stat tiles */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            label: "Presente",
            count: present,
            tone: "text-success",
            bg: "bg-success/8",
          },
          {
            label: "Tarde",
            count: late,
            tone: "text-warning",
            bg: "bg-warning/8",
          },
          {
            label: "Ausente",
            count: absent,
            tone: "text-destructive",
            bg: "bg-destructive/8",
          },
          {
            label: "Justificado",
            count: excused,
            tone: "text-info",
            bg: "bg-info/8",
          },
        ].map(({ label, count, tone, bg }) => (
          <div key={label} className={`rounded-xl p-3 ${bg}`}>
            <p className={`metric-number text-xl font-bold ${tone}`}>{count}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month card in the overview grid
// ---------------------------------------------------------------------------

function MonthCard({
  summary,
  active,
  href,
}: {
  summary: StudentAttendanceMonthSummary;
  active: boolean;
  href: string;
}) {
  const { present, late, absent, excused, total } = summary;
  const attended = Number(present) + Number(late);
  const pct =
    Number(total) > 0 ? Math.round((attended / Number(total)) * 100) : 0;
  const date = new Date(summary.year, summary.month - 1, 1);

  const tone =
    pct >= 80
      ? "text-success"
      : pct >= 50
        ? "text-warning"
        : "text-destructive";

  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={[
        "group flex flex-col gap-2 rounded-2xl border p-3 transition-colors sm:p-4",
        active
          ? "border-primary/40 bg-primary/8 ring-1 ring-primary/25"
          : "border-white/8 bg-card hover:border-white/15 hover:bg-surface-raised",
      ].join(" ")}
    >
      {/* Month label */}
      <p
        className={`text-xs font-bold capitalize ${active ? "text-primary" : "text-muted-foreground"}`}
      >
        {MONTH_SHORT.format(date)}
      </p>

      {/* Attendance % */}
      <p className={`metric-number text-2xl font-extrabold ${tone}`}>{pct}%</p>

      {/* Mini stacked bar */}
      <div
        aria-hidden="true"
        className="flex h-1.5 overflow-hidden rounded-full bg-white/8"
      >
        {Number(total) > 0 && (
          <>
            <div
              className="h-full bg-success"
              style={{ width: `${(Number(present) / Number(total)) * 100}%` }}
            />
            <div
              className="h-full bg-warning"
              style={{ width: `${(Number(late) / Number(total)) * 100}%` }}
            />
            <div
              className="h-full bg-destructive/70"
              style={{ width: `${(Number(absent) / Number(total)) * 100}%` }}
            />
          </>
        )}
      </div>

      {/* Class count */}
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {attended}/{total} clases
      </p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Month detail panel — shown when a month is selected
// ---------------------------------------------------------------------------

function AttendanceRow({ record }: { record: StudentAttendanceRecord }) {
  const cfg = STATUS[record.status];
  const duration = durationMinutes(record.startsAt, record.endsAt);

  return (
    <li className="flex items-start gap-3 py-3.5">
      {/* Dot + line */}
      <div className="relative flex flex-col items-center self-stretch pt-0.5">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background ${cfg.dot}`}
        />
        <span aria-hidden="true" className="mt-1 w-px flex-1 bg-white/8" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{record.className}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <time dateTime={record.startsAt.toISOString()}>
                {DATE_FMT.format(record.startsAt)}
              </time>
              {" · "}
              {formatDuration(duration)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
              {record.locationName}
            </p>
            {record.note ? (
              <p className="mt-1.5 rounded-lg border border-white/8 bg-surface-raised px-2.5 py-1.5 text-xs text-muted-foreground">
                {record.note}
              </p>
            ) : null}
          </div>
          <StatusPill status={record.status} />
        </div>
      </div>
    </li>
  );
}

function MonthDetail({
  summary,
  records,
}: {
  summary: StudentAttendanceMonthSummary;
  records: StudentAttendanceRecord[];
}) {
  const date = new Date(summary.year, summary.month - 1, 1);
  const { present, late, absent, excused, total } = summary;
  const attended = Number(present) + Number(late);

  return (
    <section
      aria-label={`Detalle ${MONTH_LONG.format(date)}`}
      className="rounded-2xl border border-white/8 bg-card p-4 sm:p-5"
    >
      {/* Month header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Detalle del mes
          </p>
          <h4 className="mt-0.5 text-lg font-bold capitalize">
            {MONTH_LONG.format(date)}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold tabular-nums">
          {[
            { label: `${present} pres.`, color: "text-success" },
            { label: `${late} tarde`, color: "text-warning" },
            { label: `${absent} aus.`, color: "text-destructive" },
            { label: `${excused} just.`, color: "text-info" },
          ].map(({ label, color }) => (
            <span
              key={label}
              className={`rounded-lg bg-white/6 px-2 py-1 ${color}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Mini stacked bar */}
      <div
        role="meter"
        aria-label={`${attended} de ${total} asistencias`}
        aria-valuenow={attended}
        aria-valuemin={0}
        aria-valuemax={Number(total)}
        className="mb-4 flex h-1.5 overflow-hidden rounded-full bg-white/8"
      >
        {Number(total) > 0 && (
          <>
            <div
              className="h-full bg-success"
              style={{ width: `${(Number(present) / Number(total)) * 100}%` }}
            />
            <div
              className="h-full bg-warning"
              style={{ width: `${(Number(late) / Number(total)) * 100}%` }}
            />
            <div
              className="h-full bg-destructive/70"
              style={{ width: `${(Number(absent) / Number(total)) * 100}%` }}
            />
            <div
              className="h-full bg-info/70"
              style={{ width: `${(Number(excused) / Number(total)) * 100}%` }}
            />
          </>
        )}
      </div>

      {/* Record list */}
      {records.length > 0 ? (
        <ul
          aria-label={`Registros de ${MONTH_LONG.format(date)}`}
          className="ml-1 border-l border-white/8 pl-4"
        >
          {records.map((record) => (
            <AttendanceRow key={record.sessionId} record={record} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay registros para este mes.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function StudentAttendanceHistory({
  months,
  monthDetail,
  activeYear,
  activeMonth,
  baseHref,
}: {
  months: StudentAttendanceMonthSummary[];
  monthDetail: StudentAttendanceRecord[] | null;
  activeYear: number | null;
  activeMonth: number | null;
  baseHref: string;
}) {
  if (months.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Dumbbell aria-hidden="true" className="h-6 w-6" />
        </div>
        <p className="font-semibold">Sin asistencias registradas</p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Cuando registres la asistencia del alumno desde las sesiones,
          aparecerán aquí.
        </p>
      </div>
    );
  }

  // Find active summary
  const activeSummary =
    activeYear && activeMonth
      ? months.find((m) => m.year === activeYear && m.month === activeMonth)
      : null;

  // Default: first month if none selected
  const defaultSummary = months[0];
  const displaySummary = activeSummary ?? defaultSummary;
  const displayYear = displaySummary.year;
  const displayMonth = displaySummary.month;

  return (
    <div className="space-y-5">
      {/* Overall stats */}
      <OverallSummary months={months} />

      {/* ------------------------------------------------------------------ */}
      {/* Desktop: sidebar month grid + detail panel side-by-side             */}
      {/* Mobile: month grid on top, detail panel below                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        {/* Month grid */}
        <div className="lg:w-72 lg:shrink-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Meses ({months.length})
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3">
            {months.map((m) => {
              const isActive =
                m.year === displayYear && m.month === displayMonth;
              const params = new URLSearchParams();
              params.set("section", "attendance");
              params.set("am", String(m.month));
              params.set("ay", String(m.year));
              return (
                <MonthCard
                  key={`${m.year}-${m.month}`}
                  summary={m}
                  active={isActive}
                  href={`${baseHref}&${params.toString()}`}
                />
              );
            })}
          </div>
        </div>

        {/* Divider — desktop only */}
        <div
          aria-hidden="true"
          className="hidden w-px self-stretch bg-white/8 lg:block"
        />

        {/* Detail panel — grows to fill remaining space */}
        <div className="min-w-0 flex-1">
          {monthDetail && displaySummary ? (
            <MonthDetail summary={displaySummary} records={monthDetail} />
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Selecciona un mes para ver el detalle
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
