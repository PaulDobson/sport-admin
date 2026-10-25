import Link from "next/link";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import {
  scheduleSectionsForRole,
  type ScheduleSection,
} from "@/presentation/navigation/operational-navigation";

export function ScheduleNavigation({
  role,
  activeSection,
  compact = false,
}: {
  role: TenantMembershipRole;
  activeSection: ScheduleSection;
  compact?: boolean;
}) {
  const sections = scheduleSectionsForRole(role);
  return (
    <nav aria-label="Secciones de Agenda">
      <ul
        className={
          compact ? `grid gap-2 sm:flex sm:flex-wrap` : "flex flex-wrap gap-2"
        }
        style={
          compact
            ? {
                gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {sections.map((section) => {
          const active = section.id === activeSection;
          const Icon = section.icon;
          return (
            <li key={section.id} className={compact ? "" : ""}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  compact ? "px-2 text-xs sm:px-4 sm:text-sm" : "px-4 text-sm",
                  active
                    ? "border-primary/25 bg-navigation-active text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Icon
                  aria-hidden="true"
                  className={compact ? "h-4 w-4 sm:h-4 sm:w-4" : "h-4 w-4"}
                />
                <span className={compact ? "hidden sm:inline" : undefined}>
                  {section.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
