"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { ChevronDown } from "lucide-react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import { useSidebarCollapsed } from "./app-shell";
import {
  destinationsForRole,
  isDestinationActive,
  activeScheduleSection,
  scheduleSectionsForRole,
  type NavigationDestination,
} from "@/presentation/navigation/operational-navigation";

const navigationGroups: ReadonlyArray<{
  label: string;
  destinationIds: ReadonlyArray<NavigationDestination["id"]>;
}> = [
  { label: "Operación", destinationIds: ["home", "schedule", "students"] },
  { label: "Gestión", destinationIds: ["finance", "reports"] },
];

function DesktopNavigationLink({
  label,
  children,
  ...props
}: {
  label: string;
  href: string;
  className: string;
  "aria-current"?: "page";
  children: ReactNode;
}) {
  const collapsed = useSidebarCollapsed();
  const link = (
    <Link {...props} aria-label={label}>
      {children}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={link} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="right" sideOffset={12} className="z-50">
          <Tooltip.Popup
            role="tooltip"
            className="rounded-lg border border-border bg-surface-overlay px-3 py-2 text-sm font-semibold text-foreground shadow-lg data-closed:hidden"
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function DesktopNavigation({ role }: { role: TenantMembershipRole }) {
  const pathname = usePathname();
  const destinations = destinationsForRole(role);
  const collapsed = useSidebarCollapsed();
  const submenuId = useId();
  const [submenuOverride, setSubmenuOverride] = useState<boolean | null>(null);
  const submenuOpen = submenuOverride ?? activeScheduleSection(pathname) !== null;
  return (
    <Tooltip.Provider delay={150}>
      <nav aria-label="Secciones" className="space-y-5">
        {navigationGroups.map((group) => {
          const groupDestinations = destinations.filter((destination) =>
            group.destinationIds.includes(destination.id),
          );
          if (groupDestinations.length === 0) return null;
          return (
            <section key={group.label} aria-labelledby={`${group.label}-nav`}>
              <p
                id={`${group.label}-nav`}
                className={
                  collapsed
                    ? "sr-only"
                    : "mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70"
                }
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {groupDestinations.map((destination) => {
                  const active = isDestinationActive(destination, pathname);
                  const Icon = destination.icon;
                  const hasSubmenu = destination.id === "schedule";
                  const submenuVisible = hasSubmenu && (collapsed || submenuOpen);
                  return (
                    <div key={destination.id}>
                      <div className="relative">
                      <DesktopNavigationLink
                        label={destination.label}
                        href={destination.href}
                        aria-current={
                          active && destination.id !== "schedule"
                            ? "page"
                            : undefined
                        }
                        className={`group relative flex min-h-11 items-center gap-2.5 rounded-lg px-3 transition-colors ${
                          hasSubmenu && !collapsed ? "pr-12" : ""
                        } focus-visible:outline-2 focus-visible:outline-primary ${
                          active
                            ? "bg-navigation-active font-semibold text-primary"
                            : "text-muted-foreground hover:bg-white/4 hover:text-foreground"
                        }`}
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
                              ? "grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/12 text-primary"
                              : "grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors group-hover:text-foreground"
                          }
                        >
                          <Icon
                            size={18}
                            strokeWidth={active ? 2.2 : 1.8}
                            aria-hidden="true"
                          />
                        </span>
                        <span className={collapsed ? "sr-only" : undefined}>
                          {destination.label}
                        </span>
                      </DesktopNavigationLink>
                      {hasSubmenu && !collapsed ? (
                        <button
                          type="button"
                          aria-expanded={submenuOpen}
                          aria-controls={submenuId}
                          aria-label={
                            submenuOpen
                              ? `Ocultar submenú de ${destination.label}`
                              : `Mostrar submenú de ${destination.label}`
                          }
                          title={submenuOpen ? "Ocultar submenú" : "Mostrar submenú"}
                          onClick={() => setSubmenuOverride(!submenuOpen)}
                          className={`absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md transition-colors hover:bg-white/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary ${
                            active ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className={`transition-transform duration-200 motion-reduce:transition-none ${
                              submenuOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      ) : null}
                      </div>
                      {submenuVisible ? (
                        <ul
                          id={submenuId}
                          className={
                            collapsed
                              ? "my-2 space-y-1 border-y border-border py-2"
                              : "ml-6 mt-1 space-y-1 border-l border-border pl-3"
                          }
                        >
                          {scheduleSectionsForRole(role).map((section) => {
                            const selected =
                              activeScheduleSection(pathname) === section.id;
                            const SectionIcon = section.icon;
                            return (
                              <li key={section.id}>
                                <DesktopNavigationLink
                                  label={section.label}
                                  href={section.href}
                                  aria-current={selected ? "page" : undefined}
                                  className={`flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                                    selected
                                      ? "bg-primary/5 font-semibold text-primary"
                                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                                  }`}
                                >
                                  {collapsed ? (
                                    <span
                                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                                        selected ? "bg-primary/12" : ""
                                      }`}
                                    >
                                      <SectionIcon
                                        size={18}
                                        strokeWidth={selected ? 2.2 : 1.8}
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                  <span className={collapsed ? "sr-only" : undefined}>
                                    {section.label}
                                  </span>
                                </DesktopNavigationLink>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>
    </Tooltip.Provider>
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
