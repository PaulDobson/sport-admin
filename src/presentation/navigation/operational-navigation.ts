import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Dumbbell,
  House,
  Repeat2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";

export interface NavigationDestination {
  id: "home" | "schedule" | "students" | "finance" | "reports";
  label: string;
  href: string;
  icon: LucideIcon;
  mobile: boolean;
  roles?: readonly TenantMembershipRole[];
}

export type ScheduleSection = "sessions" | "programming" | "disciplines";

const scheduleSections: ReadonlyArray<{
  id: ScheduleSection;
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: readonly TenantMembershipRole[];
}> = [
  { id: "sessions", label: "Sesiones", href: "/dashboard/schedule", icon: CalendarDays },
  {
    id: "programming",
    label: "Programación",
    href: "/dashboard/schedule/programming",
    icon: Repeat2,
    roles: ["owner", "admin", "instructor"],
  },
  {
    id: "disciplines",
    label: "Disciplinas",
    href: "/dashboard/disciplines",
    icon: Dumbbell,
  },
];

export function scheduleSectionsForRole(role: TenantMembershipRole) {
  return scheduleSections.filter(
    (section) => !section.roles || section.roles.includes(role),
  );
}

export function activeScheduleSection(pathname: string): ScheduleSection | null {
  if (pathname === "/dashboard/disciplines") return "disciplines";
  if (pathname === "/dashboard/schedule/programming") return "programming";
  if (
    pathname === "/dashboard/schedule" ||
    /^\/dashboard\/sessions\/[^/]+\/attendance\/?$/.test(pathname)
  ) return "sessions";
  return null;
}

export const operationalDestinations: readonly NavigationDestination[] = [
  {
    id: "home",
    label: "Inicio",
    href: "/dashboard",
    icon: House,
    mobile: true,
  },
  {
    id: "schedule",
    label: "Agenda",
    href: "/dashboard/schedule",
    icon: CalendarDays,
    mobile: true,
  },
  {
    id: "students",
    label: "Alumnos",
    href: "/dashboard/students",
    icon: UsersRound,
    mobile: true,
  },
  {
    id: "finance",
    label: "Finanzas",
    href: "/dashboard/finance",
    icon: CircleDollarSign,
    mobile: true,
  },
  {
    id: "reports",
    label: "Reportes",
    href: "/dashboard/reports",
    icon: ChartNoAxesCombined,
    mobile: false,
  },
];

export function destinationsForRole(role: TenantMembershipRole) {
  return operationalDestinations.filter(
    (destination) => !destination.roles || destination.roles.includes(role),
  );
}

export function isDestinationActive(
  destination: NavigationDestination,
  pathname: string,
) {
  if (destination.id === "home") return pathname === destination.href;
  if (destination.id === "schedule" && activeScheduleSection(pathname)) return true;
  return (
    pathname === destination.href || pathname.startsWith(`${destination.href}/`)
  );
}
