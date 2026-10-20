import {
  CalendarDays,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  Dumbbell,
  House,
  Repeat2,
  UsersRound,
  Brain,
  Layers,
  Timer,
  Swords,
  type LucideIcon,
} from "lucide-react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";

export interface NavigationDestination {
  id:
    | "home"
    | "schedule"
    | "students"
    | "trainings"
    | "finance"
    | "reports"
    | "gym"
    | "billing";
  label: string;
  href: string;
  icon: LucideIcon;
  mobile: boolean;
  roles?: readonly TenantMembershipRole[];
}

export type ScheduleSection = "sessions" | "programming" | "disciplines";

export type TrainingSection = "cognitive" | "combinations" | "timers";

// Pre-compiled at module load — never re-created on hot paths.
const SESSION_ATTENDANCE_RE = /^\/dashboard\/sessions\/[^/]+\/attendance\/?$/;

const scheduleSections: ReadonlyArray<{
  id: ScheduleSection;
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: readonly TenantMembershipRole[];
}> = [
  {
    id: "sessions",
    label: "Sesiones",
    href: "/dashboard/schedule",
    icon: CalendarDays,
  },
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

export function activeScheduleSection(
  pathname: string,
): ScheduleSection | null {
  if (pathname === "/dashboard/disciplines") return "disciplines";
  if (pathname === "/dashboard/schedule/programming") return "programming";
  if (
    pathname === "/dashboard/schedule" ||
    SESSION_ATTENDANCE_RE.test(pathname)
  )
    return "sessions";
  return null;
}

const trainingSections: ReadonlyArray<{
  id: TrainingSection;
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: readonly TenantMembershipRole[];
}> = [
  {
    id: "cognitive",
    label: "Cognitivos",
    href: "/dashboard/trainings/cognitive",
    icon: Brain,
  },
  {
    id: "combinations",
    label: "Combinaciones",
    href: "/dashboard/trainings/combinations",
    icon: Layers,
  },
  {
    id: "timers",
    label: "Temporizadores",
    href: "/dashboard/trainings/timers",
    icon: Timer,
  },
];

export function trainingSectionsForRole(role: TenantMembershipRole) {
  return trainingSections.filter(
    (section) => !section.roles || section.roles.includes(role),
  );
}

export function activeTrainingSection(
  pathname: string,
): TrainingSection | null {
  if (pathname.startsWith("/dashboard/trainings/cognitive")) return "cognitive";
  if (pathname.startsWith("/dashboard/trainings/combinations"))
    return "combinations";
  if (pathname.startsWith("/dashboard/trainings/timers")) return "timers";
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
    id: "trainings",
    label: "Entrenamientos",
    href: "/dashboard/trainings",
    icon: Swords,
    mobile: false,
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
  {
    id: "gym",
    label: "Mi gimnasio",
    href: "/dashboard/gym",
    icon: Building2,
    mobile: false,
    roles: ["owner", "admin"],
  },
  {
    id: "billing",
    label: "Mi suscripción",
    href: "/billing",
    icon: CreditCard,
    mobile: false,
    roles: ["owner"],
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
  if (destination.id === "schedule" && activeScheduleSection(pathname))
    return true;
  if (destination.id === "trainings" && activeTrainingSection(pathname))
    return true;
  return (
    pathname === destination.href || pathname.startsWith(`${destination.href}/`)
  );
}
