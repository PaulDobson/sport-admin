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
  return (
    <nav aria-label="Secciones de Agenda">
      <ul className={compact ? "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" : "flex flex-wrap gap-2"}>
        {scheduleSectionsForRole(role).map((section) => {
          const active = section.id === activeSection;
          const Icon = section.icon;
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${compact ? "w-full px-2 text-xs sm:px-4 sm:text-sm" : "px-4 text-sm"} ${
                  active
                    ? "border-primary/25 bg-navigation-active text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className={compact ? "hidden h-4 w-4 sm:block" : "h-4 w-4"} />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
