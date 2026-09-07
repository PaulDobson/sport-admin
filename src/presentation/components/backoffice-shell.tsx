import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/dashboard/profile/sign-out-action";

export function BackofficeShell({
  title,
  current,
  accountName = "Cuenta",
  canAccessOperation = false,
  children,
}: {
  title: string;
  current: "tenants" | "finance" | "profile";
  accountName?: string;
  canAccessOperation?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        aria-label="Navegación de administración de plataforma"
        className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-navigation/98 shadow-lg shadow-black/15 lg:flex"
      >
        <div className="flex h-20 items-center gap-3 border-b border-border/80 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-warning/30 bg-warning/15 font-bold text-warning">
            SA
          </span>
          <div>
            <p className="text-sm font-bold">Sport Admin</p>
            <p className="text-xs font-semibold text-warning">Backoffice</p>
          </div>
        </div>
        <nav
          className="space-y-1 px-3 py-4"
          aria-label="Secciones de plataforma"
        >
          <BackofficeLink
            href="/backoffice/tenants"
            active={current === "tenants"}
          >
            Tenants
          </BackofficeLink>
          <BackofficeLink
            href="/backoffice/finance"
            active={current === "finance"}
          >
            Finanzas SaaS
          </BackofficeLink>
          <BackofficeLink
            href="/backoffice/profile"
            active={current === "profile"}
          >
            Perfil
          </BackofficeLink>
        </nav>
        <div className="mt-auto border-t border-border px-5 py-4">
          <p className="truncate text-sm font-semibold text-foreground">
            {accountName}
          </p>
          <div className="mt-3 grid gap-2 text-sm font-semibold">
            <Link
              href="/backoffice/profile"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Perfil
            </Link>
            {canAccessOperation ? (
              <Link
                href="/dashboard"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Volver a operación
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-left text-destructive transition-colors hover:text-destructive/80"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/92 px-4 py-4 shadow-sm shadow-black/10 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warning">
                Administración SaaS
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold">
              <Link href="/backoffice/profile" className="text-warning">
                Perfil
              </Link>
              {canAccessOperation ? (
                <Link href="/dashboard" className="text-warning">
                  Operación
                </Link>
              ) : null}
              <form action={signOutAction}>
                <button type="submit" className="text-destructive">
                  Salir
                </button>
              </form>
            </div>
          </div>
        </header>
        <main id="main-content" className="px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function BackofficeLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "flex h-11 items-center rounded-lg border border-warning/20 bg-warning/10 px-3 font-semibold text-warning"
          : "flex h-11 items-center rounded-lg border border-transparent px-3 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}
