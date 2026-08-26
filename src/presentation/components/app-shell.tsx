import type { ReactNode } from "react";

export function AppShell({
  sidebarHeader,
  navigation,
  mobileNavigation,
  topbar,
  context,
  children,
}: {
  sidebarHeader: ReactNode;
  navigation: ReactNode;
  mobileNavigation: ReactNode;
  topbar: ReactNode;
  context?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <aside
        aria-label="Navegación principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-border bg-navigation lg:flex"
      >
        <div className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-border px-4">
          {sidebarHeader}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {navigation}
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <header className="sticky top-0 z-30 flex h-[calc(var(--topbar-height)+var(--safe-area-top))] items-end border-b border-border bg-background/95 px-4 pb-3 pt-[var(--safe-area-top)] backdrop-blur sm:px-6 lg:items-center lg:pb-0 lg:pt-0">
          <div className="w-full">{topbar}</div>
        </header>

        <div
          className={
            context
              ? "lg:grid lg:grid-cols-[minmax(0,1fr)_var(--context-rail-width)]"
              : undefined
          }
        >
          <main
            id="main-content"
            className="min-w-0 px-4 pb-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+1.5rem)] pt-5 sm:px-6 lg:pb-10 lg:pt-7"
          >
            {children}
          </main>
          {context ? (
            <aside
              aria-label="Contexto operativo"
              className="hidden min-h-[calc(100vh-var(--topbar-height))] border-l border-border bg-card/45 p-5 lg:block"
            >
              {context}
            </aside>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 min-h-[calc(var(--bottom-nav-height)+var(--safe-area-bottom))] border-t border-border bg-navigation/98 px-[max(0.5rem,var(--safe-area-right))] pb-[var(--safe-area-bottom)] backdrop-blur lg:hidden"
      >
        {mobileNavigation}
      </nav>
    </div>
  );
}

export function ProductMark({ context }: { context?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
        SA
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">Sport Admin</span>
        {context ? (
          <span className="block truncate text-xs text-muted-foreground">
            {context}
          </span>
        ) : null}
      </span>
    </div>
  );
}
