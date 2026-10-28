import {
  CalendarDays,
  CalendarPlus,
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
  /**
   * Whether this destination appears in the mobile bottom navigation.
   * The bottom nav shows 4 slots (2 before + 2 after the FAB).
   * Destinations with mobile: false are only accessible via the "Más" sheet
   * or the desktop sidebar.
   */
  mobile: boolean;
  roles?: readonly TenantMembershipRole[];
}

export type ScheduleSection = "sessions" | "programming" | "schedules";

export type TrainingSection = "cognitive" | "combinations" | "timers";

export type FinanceSection = "collections" | "plans";

// Pre-compiled at module load — never re-created on hot paths.
const SESSION_ATTENDANCE_RE = /^\/dashboard\/sessions\/[^/]+\/attendance\/?$/;

/**
 * Sub-sections of the Sesiones nav item (desktop sidebar only).
 * Disciplinas was intentionally moved out of this submenu — it belongs
 * under "Configuración / Mi gimnasio" because it is setup data, not daily
 * operations. The sidebar renders it as a gym sub-section.
 */
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
    id: "schedules",
    label: "Horarios",
    href: "/dashboard/schedule/schedules",
    icon: Repeat2,
    roles: ["owner", "admin", "instructor"],
  },
  {
    id: "programming",
    label: "Programar",
    href: "/dashboard/schedule/programming",
    icon: CalendarPlus,
    roles: ["owner", "admin", "instructor"],
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
  if (pathname === "/dashboard/schedule/programming") return "programming";
  if (pathname === "/dashboard/schedule/schedules") return "schedules";
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

/**
 * Whether the current path is under the Disciplinas section.
 * Used to mark the gym destination as active when disciplines is open.
 */
export function isDisciplinesActive(pathname: string): boolean {
  return pathname === "/dashboard/disciplines";
}

/**
 * Whether the current path is under the Class section.
 * Used to mark the gym destination as active when Class is open.
 */
export function isClassesActive(pathname: string): boolean {
  return pathname === "/dashboard/class";
}

// ---------------------------------------------------------------------------
// Finance submenu
// ---------------------------------------------------------------------------

const financeSections: ReadonlyArray<{
  id: FinanceSection;
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    id: "collections",
    label: "Cobros",
    href: "/dashboard/finance/collections",
    icon: CircleDollarSign,
  },
  {
    id: "plans",
    label: "Mantención de planes",
    href: "/dashboard/finance/plans",
    icon: CreditCard,
  },
];

export function financeSectionsForRole(_role: TenantMembershipRole) {
  // All roles that can see finance see both subsections.
  // (Assistant role cannot reach finance actions but can view them.)
  return financeSections;
}

export function activeFinanceSection(pathname: string): FinanceSection | null {
  if (pathname.startsWith("/dashboard/finance/collections"))
    return "collections";
  if (pathname.startsWith("/dashboard/finance/plans")) return "plans";
  return null;
}

/**
 * Full ordered list of navigation destinations.
 *
 * Mobile bottom nav layout (5 cols):
 *   [Sesiones] [Alumnos] [FAB] [Entrenamientos] [Más]
 *
 * "finance", "reports", "gym", "billing" are accessible via the "Más" bottom
 * sheet on mobile and via the sidebar on desktop.
 */
export const operationalDestinations: readonly NavigationDestination[] = [
  {
    id: "home",
    label: "Inicio",
    href: "/dashboard",
    icon: House,
    // Home is not in the bottom nav — the instructor goes straight to Sesiones.
    // It remains accessible from the desktop sidebar.
    mobile: false,
  },
  {
    id: "schedule",
    // Canonical label is "Sesiones" — matches topbar, submenus and FAB copy.
    // Previously called "Agenda" which created two names for the same destination.
    label: "Sesiones",
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
    // Now visible in the mobile bottom nav (slot 4 after the FAB).
    // Previously mobile: false which hid the instructor's primary tool on mobile.
    mobile: true,
  },
  {
    id: "finance",
    label: "Finanzas",
    href: "/dashboard/finance",
    icon: CircleDollarSign,
    // Moved to the "Más" sheet on mobile. Owners/admins can still reach it
    // there; instructors rarely need it as a primary tab.
    mobile: false,
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
    label: "Suscripción",
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

/**
 * Destinations shown in the "Más" bottom sheet on mobile.
 * These are all non-mobile destinations visible to the given role,
 * plus "Inicio" which is also excluded from the main bottom nav.
 */
export function moreDestinationsForRole(role: TenantMembershipRole) {
  return destinationsForRole(role).filter((destination) => !destination.mobile);
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
  // Gym is also active when navigating disciplines (its sub-section).
  if (destination.id === "gym" && isDisciplinesActive(pathname)) return true;
  // Finance is also active on its sub-routes (collections, plans).
  if (destination.id === "finance" && activeFinanceSection(pathname))
    return true;
  return (
    pathname === destination.href || pathname.startsWith(`${destination.href}/`)
  );
}
