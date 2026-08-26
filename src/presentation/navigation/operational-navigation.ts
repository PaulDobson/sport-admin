import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  House,
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
  return (
    pathname === destination.href || pathname.startsWith(`${destination.href}/`)
  );
}
