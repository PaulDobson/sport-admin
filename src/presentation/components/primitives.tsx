import type { ButtonHTMLAttributes, ReactNode } from "react";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
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
  return (
    <section
      role={tone === "info" ? "status" : "alert"}
      className={classes("rounded-md border p-4", alertClasses[tone])}
    >
      <h2 className="font-semibold text-foreground">{title}</h2>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
