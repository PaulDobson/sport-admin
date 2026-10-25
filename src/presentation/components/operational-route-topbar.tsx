"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import type {
  LocationContextOption,
  TenantContextOption,
} from "./account-context-menu";
import { OperationalTopbar } from "./operational-topbar";

// Pre-compiled regex — compiled once at module load, not on every render.
const SESSION_DETAIL_RE = /^\/dashboard\/students\/[^/]+\/edit$/;
const STUDENT_DETAIL_RE = /^\/dashboard\/students\/[^/]+$/;

/**
 * Maps a pathname to a { section, title } pair shown in the topbar.
 *
 * Rules:
 * - "section" must match the sidebar group/item label exactly (no more
 *   "Agenda" vs "Sesiones" split — canonical label is "Sesiones").
 * - Disciplines moved from "Agenda" section to "Configuración · Mi gimnasio"
 *   to match its new sidebar location.
 * - Sessions attendance uses "Sesiones" (not "Agenda · Sesiones").
 */
function routeHeading(pathname: string) {
  if (pathname === "/dashboard") {
    return { section: "Inicio", title: "Tu jornada deportiva" };
  }
  if (pathname === "/dashboard/schedule/programming") {
    return { section: "Sesiones", title: "Programación de sesiones" };
  }
  if (pathname === "/dashboard/disciplines") {
    return { section: "Configuración · Mi gimnasio", title: "Disciplinas" };
  }
  if (pathname === "/dashboard/schedule") {
    return { section: "Sesiones", title: "Sesiones" };
  }
  if (SESSION_DETAIL_RE.test(pathname)) {
    return { section: "Alumnos", title: "Editar alumno" };
  }
  if (pathname === "/dashboard/students/new") {
    return { section: "Alumnos", title: "Nuevo alumno" };
  }
  if (STUDENT_DETAIL_RE.test(pathname)) {
    return { section: "Alumno", title: "Detalle del alumno" };
  }
  if (pathname === "/dashboard/students") {
    return { section: "Alumnos", title: "Administración de alumnos" };
  }
  if (pathname === "/dashboard/trainings/cognitive") {
    return { section: "Entrenamientos", title: "Cognitivos" };
  }
  if (pathname === "/dashboard/trainings/combinations") {
    return { section: "Entrenamientos", title: "Combinaciones" };
  }
  if (pathname === "/dashboard/trainings/timers") {
    return { section: "Entrenamientos", title: "Temporizadores" };
  }
  if (pathname === "/dashboard/trainings") {
    return { section: "Entrenamientos", title: "Entrenamientos" };
  }
  if (pathname.startsWith("/dashboard/sessions/")) {
    return { section: "Sesiones", title: "Tomar asistencia" };
  }
  if (pathname.startsWith("/dashboard/finance/collections")) {
    return { section: "Finanzas", title: "Cobros" };
  }
  if (pathname.startsWith("/dashboard/finance/plans")) {
    return { section: "Finanzas", title: "Mantención de planes" };
  }
  if (pathname.startsWith("/dashboard/finance")) {
    return { section: "Finanzas", title: "Resumen financiero" };
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return { section: "Reportes", title: "Operación y finanzas" };
  }
  if (pathname.startsWith("/dashboard/profile")) {
    return { section: "Cuenta", title: "Perfil y preferencias" };
  }
  if (pathname === "/dashboard/gym") {
    return { section: "Configuración", title: "Mi gimnasio" };
  }
  return { section: "Operación", title: "Sport Admin" };
}

export function OperationalRouteTopbar({
  tenantName,
  account,
  extraActions,
}: {
  tenantName: string;
  account: {
    profileName: string;
    currentTenantId: string;
    tenants: TenantContextOption[];
    roleLabel: string;
    canManageGym?: boolean;
    canReadBilling?: boolean;
    locations?: LocationContextOption[];
    currentLocationId?: string;
  };
  extraActions?: ReactNode;
}) {
  const pathname = usePathname();

  // Memoize heading — only recomputes when pathname actually changes.
  const heading = useMemo(() => routeHeading(pathname), [pathname]);

  // Memoize the back-link node — only recreated when the pathname condition flips.
  const isSessionRoute = pathname.startsWith("/dashboard/sessions/");
  const backLink = useMemo(
    () =>
      isSessionRoute ? (
        <Link
          href="/dashboard/schedule"
          className="hidden text-sm font-semibold text-primary md:block"
        >
          ← Sesiones
        </Link>
      ) : undefined,
    [isSessionRoute],
  );

  const actions =
    backLink || extraActions ? (
      <>
        {extraActions}
        {backLink}
      </>
    ) : undefined;

  return (
    <OperationalTopbar
      section={heading.section}
      title={heading.title}
      tenantName={tenantName}
      account={account}
      actions={actions}
    />
  );
}
