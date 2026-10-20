"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const SidebarContext = createContext<{
  collapsed: boolean;
  toggle: () => void;
}>({ collapsed: false, toggle: () => {} });

export function useSidebarCollapsed() {
  return useContext(SidebarContext).collapsed;
}

export function useSidebarToggle() {
  return useContext(SidebarContext).toggle;
}

export function AppShell({
  sidebarHeader,
  navigation,
  mobileNavigation,
  topbar,
  children,
}: {
  sidebarHeader: ReactNode;
  navigation: ReactNode;
  mobileNavigation: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarId = useId();
  const toggle = useCallback(() => setCollapsed((v) => !v), []);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? "Expandir navegación" : "Colapsar navegación";

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div
        data-sidebar-collapsed={collapsed}
        className="group/sidebar min-h-screen bg-background text-foreground"
      >
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-100 -translate-y-20 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <aside
          id={sidebarId}
          aria-label="Navegación principal"
          className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-navigation transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
            collapsed ? "w-20" : "w-(--sidebar-width)"
          }`}
        >
          <div className="flex h-(--topbar-height) shrink-0 items-center px-4">
            {sidebarHeader}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-4">
            {navigation}
          </div>
          <div className="shrink-0 border-t border-white/5 px-2.5 py-3">
            <button
              type="button"
              aria-label={toggleLabel}
              aria-controls={sidebarId}
              aria-expanded={!collapsed}
              title={toggleLabel}
              onClick={toggle}
              className={`hidden min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary lg:flex ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center">
                <ToggleIcon size={18} aria-hidden="true" />
              </span>
              <span className={collapsed ? "sr-only" : undefined}>
                {collapsed ? "Expandir menú" : "Colapsar menú"}
              </span>
            </button>
          </div>
        </aside>

        <div
          className={`min-h-screen transition-[padding] duration-200 motion-reduce:transition-none ${
            collapsed ? "lg:pl-20" : "lg:pl-(--sidebar-width)"
          }`}
        >
          <header className="sticky top-0 z-30 flex min-h-[calc(var(--topbar-height)+var(--safe-area-top))] items-end border-b border-white/5 bg-background/92 px-4 pb-3 pt-[calc(var(--safe-area-top)+0.75rem)] backdrop-blur sm:px-6 lg:items-center lg:pb-0 lg:pt-[var(--safe-area-top)]">
            <div className="w-full min-w-0">{topbar}</div>
          </header>

          <main
            id="main-content"
            className="min-w-0 px-4 pb-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+1.5rem)] pt-5 sm:px-6 lg:pb-10 lg:pt-7"
          >
            {children}
          </main>
        </div>

        <nav
          aria-label="Navegación móvil"
          className="fixed inset-x-0 bottom-0 z-50 min-h-[calc(var(--bottom-nav-height)+var(--safe-area-bottom))] border-t border-border/80 bg-navigation/98 px-[max(0.5rem,var(--safe-area-right))] pb-(--safe-area-bottom) shadow-[0_-12px_28px_rgba(0,0,0,0.24)] backdrop-blur lg:hidden"
        >
          {mobileNavigation}
        </nav>
      </div>
    </SidebarContext.Provider>
  );
}

export function ProductMark({ context }: { context?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 group-data-[sidebar-collapsed=true]/sidebar:mx-auto">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground"
      >
        SA
      </span>
      <span className="min-w-0 group-data-[sidebar-collapsed=true]/sidebar:sr-only">
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
