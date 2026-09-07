"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import {
  destinationsForRole,
  isDestinationActive,
  type NavigationDestination,
} from "@/presentation/navigation/operational-navigation";

const navigationGroups: ReadonlyArray<{
  label: string;
  destinationIds: ReadonlyArray<NavigationDestination["id"]>;
}> = [
  { label: "Operación", destinationIds: ["home", "schedule", "students"] },
  { label: "Gestión", destinationIds: ["finance", "reports"] },
];

export function DesktopNavigation({ role }: { role: TenantMembershipRole }) {
  const pathname = usePathname();
  const destinations = destinationsForRole(role);
  return (
    <nav aria-label="Secciones" className="space-y-6">
      {navigationGroups.map((group) => {
        const groupDestinations = destinations.filter((destination) =>
          group.destinationIds.includes(destination.id),
        );
        if (groupDestinations.length === 0) return null;
        return (
          <section key={group.label} aria-labelledby={`${group.label}-nav`}>
            <p
              id={`${group.label}-nav`}
              className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80"
            >
              {group.label}
            </p>
            <div className="space-y-1">
              {groupDestinations.map((destination) => {
                const active = isDestinationActive(destination, pathname);
                const Icon = destination.icon;
                return (
                  <Link
                    key={destination.id}
                    href={destination.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "group relative flex min-h-12 items-center gap-3 rounded-xl border border-primary/20 bg-navigation-active px-3 font-semibold text-primary shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
                        : "group flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-3 text-muted-foreground transition-colors hover:border-border/70 hover:bg-surface-raised hover:text-foreground"
                    }
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={
                        active
                          ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"
                          : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-raised/70 text-muted-foreground transition-colors group-hover:text-foreground"
                      }
                    >
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.2 : 1.8}
                        aria-hidden="true"
                      />
                    </span>
                    <span>{destination.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

export function MobileNavigation({
  role,
  quickAction,
}: {
  role: TenantMembershipRole;
  quickAction: ReactNode;
}) {
  const pathname = usePathname();
  const destinations = destinationsForRole(role).filter(
    (destination) => destination.mobile,
  );
  const beforeAction = destinations.slice(0, 2);
  const afterAction = destinations.slice(2, 4);

  const renderDestination = (destination: (typeof destinations)[number]) => {
    const active = isDestinationActive(destination, pathname);
    const Icon = destination.icon;
    return (
      <Link
        key={destination.id}
        href={destination.href}
        aria-current={active ? "page" : undefined}
        className={
          active
            ? "flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-primary/15 bg-navigation-active text-primary shadow-sm shadow-primary/5"
            : "flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-transparent text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
        }
      >
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
        <span className="max-w-full truncate text-[11px] font-semibold">
          {destination.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="grid h-[var(--bottom-nav-height)] grid-cols-5 gap-1">
      {beforeAction.map(renderDestination)}
      <div className="grid place-items-center">{quickAction}</div>
      {afterAction.map(renderDestination)}
    </div>
  );
}
