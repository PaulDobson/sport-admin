import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowLeftRight,
  Building2,
  FileText,
  Layers3,
  LayoutDashboard,
  LogOut,
  UserRound,
  WalletCards,
} from "lucide-react";
import { signOutAction } from "@/app/dashboard/profile/sign-out-action";
import { Avatar } from "./primitives";

export type BackofficeSection = "overview" | "tenants" | "plans" | "collections" | "finance" | "profile";

interface BackofficeNavItem {
  key: BackofficeSection;
  href: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const navItems: BackofficeNavItem[] = [
  {
    key: "overview",
    href: "/backoffice",
    label: "Resumen",
    shortLabel: "Resumen",
    icon: LayoutDashboard,
  },
  {
    key: "tenants",
    href: "/backoffice/tenants",
    label: "Tenants",
    shortLabel: "Tenants",
    icon: Building2,
  },
  {
    key: "plans",
    href: "/backoffice/plans",
    label: "Planes",
    shortLabel: "Planes",
    icon: Layers3,
  },
  {
    key: "collections",
    href: "/backoffice/collections",
    label: "Cobranza",
    shortLabel: "Cobros",
    icon: FileText,
  },
  {
    key: "finance",
    href: "/backoffice/finance",
    label: "Finanzas SaaS",
    shortLabel: "Finanzas",
    icon: WalletCards,
  },
  {
    key: "profile",
    href: "/backoffice/profile",
    label: "Perfil",
    shortLabel: "Perfil",
    icon: UserRound,
  },
];

export function BackofficeShell({
  title,
  description,
  current,
  accountName = "Cuenta",
  avatarUrl = null,
  canAccessOperation = false,
  actions,
  children,
}: {
  title: string;
  description?: string;
  current: BackofficeSection;
  accountName?: string;
  avatarUrl?: string | null;
  canAccessOperation?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      <aside
        aria-label="Navegación de administración de plataforma"
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col bg-navigation lg:flex"
      >
        <div className="flex h-[var(--topbar-height)] shrink-0 items-center px-4">
          <BackofficeMark />
        </div>
        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 py-4"
          aria-label="Secciones de plataforma"
        >
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
            Plataforma
          </p>
          {navItems.map((item) => (
            <SidebarLink key={item.key} item={item} active={current === item.key} />
          ))}
        </nav>
        <div className="shrink-0 border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/3 p-2.5">
            <Avatar name={accountName} src={avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {accountName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Administrador de plataforma
              </p>
            </div>
          </div>
          <div className="mt-2 grid gap-0.5 text-sm font-medium">
            {canAccessOperation ? (
              <Link
                href="/dashboard"
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-white/4 hover:text-foreground"
              >
                <ArrowLeftRight aria-hidden className="h-4 w-4" />
                Volver a operación
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-background/92 px-4 pb-3 pt-[calc(var(--safe-area-top)+0.75rem)] backdrop-blur sm:px-6 lg:flex lg:min-h-[var(--topbar-height)] lg:items-center lg:py-0">
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="lg:hidden">
                <BackofficeBadge />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-warning">
                  Administración SaaS
                </p>
                <h1 className="truncate text-base font-bold sm:text-xl">
                  {title}
                </h1>
                {description ? (
                  <p className="hidden truncate text-xs text-muted-foreground sm:block">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              {canAccessOperation ? (
                <Link
                  href="/dashboard"
                  className="hidden min-h-10 items-center gap-2 rounded-lg border border-white/8 px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/4 hover:text-foreground sm:inline-flex"
                >
                  <ArrowLeftRight aria-hidden className="h-4 w-4" />
                  Operación
                </Link>
              ) : null}
              <Link
                href="/backoffice/profile"
                aria-label="Perfil"
                className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/40"
              >
                <Avatar name={accountName} src={avatarUrl} size="md" />
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label="Salir"
                  title="Salir"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut aria-hidden className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="min-w-0 px-4 pb-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+1.5rem)] pt-5 sm:px-6 lg:pb-10 lg:pt-7"
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <nav
        aria-label="Navegación móvil de plataforma"
        className="fixed inset-x-0 bottom-0 z-50 min-h-[calc(var(--bottom-nav-height)+var(--safe-area-bottom))] border-t border-border/80 bg-navigation/98 px-2 pb-[var(--safe-area-bottom)] shadow-[0_-12px_28px_rgba(0,0,0,0.24)] backdrop-blur lg:hidden"
      >
        <ul className="grid h-[var(--bottom-nav-height)] grid-cols-6">
          {navItems.map((item) => {
            const active = current === item.key;
            const Icon = item.icon;
            return (
              <li key={item.key} className="flex">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
                    active
                      ? "text-warning"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                      active ? "bg-warning/15" : ""
                    }`}
                  >
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  {item.shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function BackofficeBadge() {
  return (
    <span
      aria-hidden="true"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-warning/30 bg-warning/15 text-sm font-bold text-warning"
    >
      SA
    </span>
  );
}

function BackofficeMark() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BackofficeBadge />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-tight">
          Sport Admin
        </span>
        <span className="block truncate text-xs font-semibold text-warning">
          Backoffice
        </span>
      </span>
    </div>
  );
}

function SidebarLink({
  item,
  active,
}: {
  item: BackofficeNavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${
        active
          ? "bg-warning/10 font-semibold text-warning before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-warning"
          : "font-medium text-muted-foreground hover:bg-white/4 hover:text-foreground"
      }`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center">
        <Icon aria-hidden className="h-[18px] w-[18px]" />
      </span>
      {item.label}
    </Link>
  );
}
