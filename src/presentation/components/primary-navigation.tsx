"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import {
  destinationsForRole,
  isDestinationActive,
} from "@/presentation/navigation/operational-navigation";

export function DesktopNavigation({ role }: { role: TenantMembershipRole }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className="space-y-1">
      {destinationsForRole(role).map((destination) => {
        const active = isDestinationActive(destination, pathname);
        const Icon = destination.icon;
        return (
          <Link
            key={destination.id}
            href={destination.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex h-11 items-center gap-3 rounded-md bg-navigation-active px-3 font-semibold text-primary"
                : "flex h-11 items-center gap-3 rounded-md px-3 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            }
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{destination.label}</span>
          </Link>
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
            ? "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md text-primary"
            : "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md text-muted-foreground"
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
