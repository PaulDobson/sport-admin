import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { ToneBadge, type ToneBadgeTone } from "./primitives";

export interface DistributionSegment {
  key: string;
  label: string;
  value: number;
  display?: ReactNode;
  fillClassName: string;
}

/** Stacked horizontal bar with an always-visible text legend (never colour alone). */
export function DistributionBar({
  label,
  segments,
  showShare = true,
}: {
  label: string;
  segments: DistributionSegment[];
  showShare?: boolean;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const share = (value: number) => (total > 0 ? (value / total) * 100 : 0);
  const summary = segments
    .map((segment) => `${segment.label}: ${Math.round(share(segment.value))}%`)
    .join(", ");

  return (
    <div>
      <div
        role="img"
        aria-label={`${label}. ${total > 0 ? summary : "Sin datos"}`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/6"
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <span
              key={segment.key}
              className={`h-full first:rounded-l-full last:rounded-r-full ${segment.fillClassName}`}
              style={{ width: `${share(segment.value)}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2.5">
        {segments.map((segment) => (
          <li
            key={segment.key}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${segment.fillClassName}`}
              />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="metric-number font-semibold text-foreground">
                {segment.display ?? segment.value}
              </span>
              {showShare ? (
                <span className="metric-number w-10 text-right text-[11px] text-muted-foreground">
                  {Math.round(share(segment.value))}%
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Usage against a limit; turns warning at 80% and destructive when the limit is reached. */
export function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const ratio = limit > 0 ? used / limit : 0;
  const percent = Math.min(ratio * 100, 100);
  const fill =
    ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-warning" : "bg-primary";

  return (
    <div className="rounded-xl bg-white/4 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {label}
        </span>
        <span className="metric-number text-sm font-bold text-foreground">
          {used}
          <span className="font-medium text-muted-foreground">/{limit}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label}: ${used} de ${limit}`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"
      >
        <span
          className={`block h-full rounded-full ${fill}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Compact list row inspired by ledger/matrix layouts: title + caption left, value + status right. */
export function InsightRow({
  title,
  caption,
  value,
  status,
  href,
  leading,
}: {
  title: ReactNode;
  caption?: ReactNode;
  value?: ReactNode;
  status?: { label: ReactNode; tone: ToneBadgeTone };
  href?: string;
  leading?: ReactNode;
}) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {title}
        </span>
        {caption ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {caption}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {value !== undefined ? (
          <span className="metric-number text-sm font-bold text-foreground">
            {value}
          </span>
        ) : null}
        {status ? <ToneBadge tone={status.tone}>{status.label}</ToneBadge> : null}
      </span>
      {href ? (
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      ) : null}
    </>
  );
  const className =
    "group flex min-h-14 items-center gap-3 rounded-xl border border-white/5 bg-white/2.5 px-3 py-2.5";

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} transition-colors hover:border-primary/25 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary`}
      >
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
