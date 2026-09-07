import { useId } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
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

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
        "rounded-xl border p-4",
        surfaceTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function FieldControl({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
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
