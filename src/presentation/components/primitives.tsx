import Link from "next/link";
import { useId } from "react";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ComponentType,
  HTMLAttributes,
  ReactNode,
} from "react";
import { Spinner } from "./spinner";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border-border bg-surface-raised text-foreground hover:bg-surface-overlay",
  quiet:
    "border-transparent bg-transparent text-foreground hover:bg-surface-raised",
  danger:
    "border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/15",
};

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({
  children,
  className,
  type = "button",
  variant = "secondary",
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner className="h-4 w-4 shrink-0" /> : null}
      {children}
    </button>
  );
}

type SurfaceTone = "default" | "raised" | "subtle";

const surfaceTones: Record<SurfaceTone, string> = {
  default: "border-border bg-card shadow-lg shadow-black/10",
  raised: "border-border bg-surface-raised shadow-lg shadow-black/10",
  subtle: "border-border bg-transparent",
};

export function Surface({
  children,
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: SurfaceTone }) {
  return (
    <section
      className={classes(
        "rounded-md border p-4",
        surfaceTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function FieldControl({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={classes(
        "h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  tooltip?: string;
}

export function IconButton({
  label,
  icon,
  tooltip = label,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <span className="group relative inline-flex">
      <button
        type={type}
        aria-label={label}
        className={classes(
          "inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-45",
          className,
        )}
        {...props}
      >
        {icon}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-foreground shadow-lg group-hover:block group-focus-within:block"
      >
        {tooltip}
      </span>
    </span>
  );
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

const avatarSizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={classes(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary font-semibold text-secondary-foreground",
        avatarSizes[size],
      )}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

type StatusTone = "neutral" | "success" | "warning" | "destructive" | "info";

const statusClasses: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={classes(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
        statusClasses[tone],
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

type SyncStatusTone = "synced" | "offline" | "syncing" | "pending" | "conflict";

const syncStatusTone: Record<SyncStatusTone, StatusTone> = {
  synced: "success",
  offline: "neutral",
  syncing: "info",
  pending: "warning",
  conflict: "destructive",
};

export function SyncStatusBadge({
  status,
  children,
}: {
  status: SyncStatusTone;
  children: ReactNode;
}) {
  return <StatusBadge tone={syncStatusTone[status]}>{children}</StatusBadge>;
}

export type ToneBadgeTone = StatusTone;

const toneBadgeClasses: Record<ToneBadgeTone, string> = {
  neutral: "bg-white/6 text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
};

/** Compact semantic label: always text plus tone, never colour alone. */
export function ToneBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: ToneBadgeTone;
  className?: string;
}) {
  return (
    <span
      className={classes(
        "metric-number inline-flex min-h-6 shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
        toneBadgeClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type StatAccent = "primary" | "info" | "warning" | "success" | "destructive";

const statAccentClasses: Record<StatAccent, { icon: string; glow: string }> = {
  primary: { icon: "bg-primary/12 text-primary ring-primary/20", glow: "from-primary/12" },
  info: { icon: "bg-info/12 text-info ring-info/20", glow: "from-info/12" },
  warning: { icon: "bg-warning/12 text-warning ring-warning/20", glow: "from-warning/12" },
  success: { icon: "bg-success/12 text-success ring-success/20", glow: "from-success/12" },
  destructive: {
    icon: "bg-destructive/12 text-destructive ring-destructive/20",
    glow: "from-destructive/12",
  },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  accent?: StatAccent;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badge?: { label: ReactNode; tone: ToneBadgeTone };
  href?: string;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  note,
  accent = "primary",
  icon: Icon,
  badge,
  href,
  children,
}: StatCardProps) {
  const tone = statAccentClasses[accent];
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} via-transparent to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-xs font-medium text-muted-foreground sm:text-sm">
          {label}
        </h3>
        {badge ? (
          <ToneBadge tone={badge.tone}>{badge.label}</ToneBadge>
        ) : Icon ? (
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${tone.icon}`}
          >
            <Icon aria-hidden className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="metric-number relative mt-2 truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {value}
      </p>
      {note ? (
        <p className="relative mt-1 truncate text-xs text-muted-foreground">
          {note}
        </p>
      ) : null}
      {children ? <div className="relative mt-3">{children}</div> : null}
    </>
  );
  const cardClass =
    "relative block min-h-11 min-w-0 overflow-hidden rounded-2xl border border-white/6 bg-card p-4 sm:p-5";
  if (href) {
    return (
      <Link
        href={href}
        className={classes(
          cardClass,
          "transition-colors hover:border-primary/25 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        )}
      >
        {body}
      </Link>
    );
  }
  return <article className={cardClass}>{body}</article>;
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  labelledBy,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={classes(
        "min-w-0 rounded-2xl border border-white/6 bg-card p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={labelledBy} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface ResponsiveTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  align?: "start" | "end";
}

/** Table on desktop, card list on mobile; both expose the same data and actions. */
export function ResponsiveTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  renderCard,
}: {
  caption: string;
  columns: ResponsiveTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  renderCard: (row: Row) => ReactNode;
}) {
  return (
    <>
      <ul aria-label={caption} className="grid gap-2 lg:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-xl border border-white/6 bg-surface-raised/60 p-3"
          >
            {renderCard(row)}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-white/6">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={classes(
                    "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                    column.align === "end" ? "text-right" : "text-left",
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-white/6 last:border-b-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={classes(
                      "px-3 py-3.5 align-middle",
                      column.align === "end" ? "text-right" : "text-left",
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="border-y border-border py-10 text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={classes(
        "block animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}

type AlertTone = "info" | "warning" | "destructive";

const alertClasses: Record<AlertTone, string> = {
  info: "border-info/35 bg-info/10",
  warning: "border-warning/35 bg-warning/10",
  destructive: "border-destructive/35 bg-destructive/10",
};

export function Alert({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: ReactNode;
  tone?: AlertTone;
}) {
  const titleId = useId();
  return (
    <section
      role={tone === "info" ? "status" : "alert"}
      aria-labelledby={titleId}
      className={classes("rounded-md border p-4", alertClasses[tone])}
    >
      <h2 id={titleId} className="font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
