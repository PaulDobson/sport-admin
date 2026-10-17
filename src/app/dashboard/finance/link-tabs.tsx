import Link from "next/link";

export interface LinkTab {
  id: string;
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

function tabClass(active: boolean, compact: boolean) {
  return [
    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    compact ? "px-3 text-xs" : "px-4 text-sm",
    active
      ? "border-primary/25 bg-navigation-active text-primary"
      : "border-border text-muted-foreground hover:bg-surface-raised hover:text-foreground",
  ].join(" ");
}

/** URL-driven pill tabs: navigation keeps filters shareable and works without JavaScript. */
export function LinkTabs({
  label,
  tabs,
  compact = false,
}: {
  label: string;
  tabs: LinkTab[];
  compact?: boolean;
}) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex gap-2">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              aria-label={
                tab.count !== undefined
                  ? `${tab.label} (${tab.count})`
                  : undefined
              }
              className={tabClass(tab.active, compact)}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span
                  aria-hidden="true"
                  className={[
                    "metric-number inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-[11px]",
                    tab.active
                      ? "bg-primary/15 text-primary"
                      : "bg-white/6 text-muted-foreground",
                  ].join(" ")}
                >
                  {tab.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
