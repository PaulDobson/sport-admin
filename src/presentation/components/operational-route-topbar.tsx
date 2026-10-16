"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type {
  LocationContextOption,
  TenantContextOption,
} from "./account-context-menu";
import { OperationalTopbar } from "./operational-topbar";

function routeHeading(pathname: string) {
  if (pathname === "/dashboard") {
    return { section: "Jornada", title: "Tu jornada deportiva" };
  }
  if (pathname === "/dashboard/schedule/programming") {
    return { section: "Agenda", title: "Programación de sesiones" };
  }
  if (pathname === "/dashboard/disciplines") {
    return { section: "Agenda", title: "Administración de disciplinas" };
  }
  if (pathname === "/dashboard/schedule") {
    return { section: "Agenda", title: "Sesiones" };
  }
  if (/^\/dashboard\/students\/[^/]+\/edit$/.test(pathname)) {
    return { section: "Alumnos", title: "Editar alumno" };
  }
  if (pathname === "/dashboard/students/new") {
    return { section: "Alumnos", title: "Nuevo alumno" };
  }
  if (/^\/dashboard\/students\/[^/]+$/.test(pathname)) {
    return { section: "Alumno", title: "Detalle del alumno" };
  }
  if (pathname === "/dashboard/students") {
    return { section: "Alumnos", title: "Administración de alumnos" };
  }
  if (pathname.startsWith("/dashboard/sessions/")) {
    return { section: "Agenda · Sesiones", title: "Tomar asistencia" };
  }
  if (pathname.startsWith("/dashboard/finance")) {
    return { section: "Finanzas", title: "Membresías y finanzas" };
  }
  if (pathname.startsWith("/dashboard/reports")) {
    return { section: "Reportes", title: "Operación y finanzas" };
  }
  if (pathname.startsWith("/dashboard/profile")) {
    return { section: "Cuenta", title: "Perfil y preferencias" };
  }
  return { section: "Operación", title: "Sport Admin" };
}

export function OperationalRouteTopbar({
  tenantName,
  account,
}: {
  tenantName: string;
  account: {
    profileName: string;
    currentTenantId: string;
    tenants: TenantContextOption[];
    roleLabel: string;
    locations?: LocationContextOption[];
    currentLocationId?: string;
  };
}) {
  const pathname = usePathname();
  const heading = routeHeading(pathname);
  const backLink = pathname.startsWith("/dashboard/sessions/") ? (
    <Link
      href="/dashboard/schedule"
      className="hidden text-sm font-semibold text-primary md:block"
    >
      Volver a sesiones
    </Link>
  ) : undefined;

  return (
    <OperationalTopbar
      key={pathname}
      section={heading.section}
      title={heading.title}
      tenantName={tenantName}
      account={account}
      actions={backLink}
    />
  );
}
