import type { ReactNode } from "react";

export function AppShell({
  sidebarHeader,
  navigation,
  mobileNavigation,
  topbar,
  topbarActions,
  context,
  children,
}: {
  sidebarHeader: ReactNode;
  navigation: ReactNode;
  mobileNavigation: ReactNode;
  topbar: ReactNode;
  topbarActions?: ReactNode;
  context?: ReactNode;
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
        aria-label="Navegación principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-border/80 bg-navigation/98 shadow-[18px_0_40px_rgba(0,0,0,0.18)] lg:flex"
      >
        <div className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-border/70 px-4">
          {sidebarHeader}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          {navigation}
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <header className="sticky top-0 z-30 flex min-h-[calc(var(--topbar-height)+var(--safe-area-top))] items-end border-b border-border/80 bg-background/92 px-4 pb-3 pt-[calc(var(--safe-area-top)+0.75rem)] shadow-sm shadow-black/10 backdrop-blur sm:px-6 lg:items-center lg:pb-0 lg:pt-[var(--safe-area-top)]">
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">{topbar}</div>
            {topbarActions ? (
              <div className="flex shrink-0 items-center justify-end gap-2">
                {topbarActions}
              </div>
            ) : null}
          </div>
        </header>

        <div
          className={
            context
              ? "lg:grid lg:min-h-[calc(100vh-var(--topbar-height))] lg:grid-cols-[minmax(0,1fr)_var(--context-rail-width)]"
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
              className="hidden border-l border-border/80 bg-card/45 p-5 lg:sticky lg:top-[var(--topbar-height)] lg:block lg:h-[calc(100vh-var(--topbar-height))] lg:overflow-y-auto"
            >
              {context}
            </aside>
          ) : null}
        </div>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 min-h-[calc(var(--bottom-nav-height)+var(--safe-area-bottom))] border-t border-border/80 bg-navigation/98 px-[max(0.5rem,var(--safe-area-right))] pb-[var(--safe-area-bottom)] shadow-[0_-12px_28px_rgba(0,0,0,0.24)] backdrop-blur lg:hidden"
      >
        {mobileNavigation}
      </nav>
    </div>
  );
}

export function ProductMark({ context }: { context?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary font-bold text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_24px_rgba(49,209,159,0.16)]">
        SA
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-tight">
          Sport Admin
        </span>
        {context ? (
          <span className="block truncate text-xs font-medium text-muted-foreground">
            {context}
          </span>
        ) : null}
      </span>
    </div>
  );
}
