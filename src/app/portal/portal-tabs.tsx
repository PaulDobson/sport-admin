"use client";

import { CalendarCheck2, ClipboardList } from "lucide-react";
import Link from "next/link";

export type PortalTab = "schedule" | "history";

const TABS: { id: PortalTab; label: string; icon: typeof CalendarCheck2; href: (base: string) => string }[] = [
  {
    id: "schedule",
    label: "Confirmación de clases",
    icon: CalendarCheck2,
    href: (base) => base,
  },
  {
    id: "history",
    label: "Mis asistencias",
    icon: ClipboardList,
    href: (base) => `${base}?tab=history`,
  },
];

export function PortalTabNav({
  activeTab,
  baseHref,
  studentId,
}: {
  activeTab: PortalTab;
  baseHref: string;
  studentId?: string;
}) {
  function buildHref(tabId: PortalTab) {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    if (tabId === "history") params.set("tab", "history");
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  }

  return (
    <nav
      aria-label="Secciones del portal"
      className="no-scrollbar -mx-4 flex overflow-x-auto border-b border-white/8 px-4 sm:mx-0 sm:px-0"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <Link
            key={id}
            href={buildHref(id)}
            aria-current={active ? "page" : undefined}
            className={[
              "flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition-colors",
              "mr-6 last:mr-0",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Icon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
