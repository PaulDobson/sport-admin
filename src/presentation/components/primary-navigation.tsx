"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useId, useMemo, useState, type ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { ChevronDown } from "lucide-react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";
import { useSidebarCollapsed } from "./app-shell";
import {
  destinationsForRole,
  isDestinationActive,
  activeScheduleSection,
  scheduleSectionsForRole,
  activeTrainingSection,
  trainingSectionsForRole,
  type NavigationDestination,
} from "@/presentation/navigation/operational-navigation";

const navigationGroups: ReadonlyArray<{
  label: string;
  destinationIds: ReadonlyArray<NavigationDestination["id"]>;
}> = [
  {
    label: "Operación",
    destinationIds: ["home", "schedule", "students", "trainings"],
  },
  {
    label: "Gestión",
    destinationIds: ["finance", "reports", "gym", "billing"],
  },
];

// memo prevents re-rendering when the parent re-renders due to collapsed state
// changes that don't affect this link's own collapsed consumption.
const DesktopNavigationLink = memo(function DesktopNavigationLink({
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
});

export function DesktopNavigation({ role }: { role: TenantMembershipRole }) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const scheduleSubmenuId = useId();
  const trainingsSubmenuId = useId();
  const [scheduleSubmenuOverride, setScheduleSubmenuOverride] = useState<
    boolean | null
  >(null);
  const [trainingsSubmenuOverride, setTrainingsSubmenuOverride] = useState<
    boolean | null
  >(null);

  // Memoize role-derived lists — role never changes during a session.
  const destinations = useMemo(() => destinationsForRole(role), [role]);
  const scheduleSubmenuItems = useMemo(
    () => scheduleSectionsForRole(role),
    [role],
  );
  const trainingsSubmenuItems = useMemo(
    () => trainingSectionsForRole(role),
    [role],
  );

  // Derive once per render — avoids calling active*Section twice.
  const activeSchedule = useMemo(
    () => activeScheduleSection(pathname),
    [pathname],
  );
  const activeTraining = useMemo(
    () => activeTrainingSection(pathname),
    [pathname],
  );

  const scheduleSubmenuOpen =
    scheduleSubmenuOverride ?? activeSchedule !== null;
  const trainingsSubmenuOpen =
    trainingsSubmenuOverride ?? activeTraining !== null;

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
                  const isSchedule = destination.id === "schedule";
                  const isTrainings = destination.id === "trainings";
                  const hasSubmenu = isSchedule || isTrainings;

                  const submenuOpen = isSchedule
                    ? scheduleSubmenuOpen
                    : isTrainings
                      ? trainingsSubmenuOpen
                      : false;

                  const submenuId = isSchedule
                    ? scheduleSubmenuId
                    : trainingsSubmenuId;

                  const submenuItems = isSchedule
                    ? scheduleSubmenuItems
                    : isTrainings
                      ? trainingsSubmenuItems
                      : [];

                  const activeSubmenuSection = isSchedule
                    ? activeSchedule
                    : isTrainings
                      ? activeTraining
                      : null;

                  const toggleSubmenu = isSchedule
                    ? () => setScheduleSubmenuOverride(!scheduleSubmenuOpen)
                    : () => setTrainingsSubmenuOverride(!trainingsSubmenuOpen);

                  const submenuVisible =
                    hasSubmenu && (collapsed || submenuOpen);

                  return (
                    <div key={destination.id}>
                      <div className="relative">
                        <DesktopNavigationLink
                          label={destination.label}
                          href={destination.href}
                          aria-current={
                            active && !hasSubmenu ? "page" : undefined
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
                            title={
                              submenuOpen
                                ? "Ocultar submenú"
                                : "Mostrar submenú"
                            }
                            onClick={toggleSubmenu}
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
                          {submenuItems.map((section) => {
                            const selected =
                              activeSubmenuSection === section.id;
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
                                  <span
                                    className={
                                      collapsed ? "sr-only" : undefined
                                    }
                                  >
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

  // Memoize — role is stable throughout a session.
  const destinations = useMemo(
    () => destinationsForRole(role).filter((destination) => destination.mobile),
    [role],
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
            ? "flex min-h-15 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-primary/15 bg-navigation-active text-primary shadow-sm shadow-primary/5"
            : "flex min-h-15 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-transparent text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
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
    <div className="grid h-(--bottom-nav-height) grid-cols-5 gap-1">
      {beforeAction.map(renderDestination)}
      <div className="grid place-items-center">{quickAction}</div>
      {afterAction.map(renderDestination)}
    </div>
  );
}
