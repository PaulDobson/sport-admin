import type { ReactNode } from "react";
import {
  AccountContextMenu,
  type LocationContextOption,
  type TenantContextOption,
} from "./account-context-menu";

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Santiago",
});

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Santiago",
});

export function OperationalTopbar({
  section,
  title,
  tenantName,
  account,
  actions,
  now = new Date(),
}: {
  section: string;
  title: string;
  tenantName: string;
  account: {
    profileName: string;
    currentTenantId: string;
    tenants: TenantContextOption[];
    roleLabel: string;
    locations?: LocationContextOption[];
    currentLocationId?: string;
  };
  actions?: ReactNode;
  now?: Date;
}) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:gap-5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary sm:hidden">
          {section}
        </p>
        <h1 className="truncate text-base font-bold sm:text-lg">{title}</h1>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="hidden sm:inline">{section} · </span>
          Gestionando{" "}
          <span className="font-semibold text-foreground">{tenantName}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <div className="hidden shrink-0 border-l border-white/8 pl-4 text-right sm:block">
          <p className="text-xs font-bold capitalize text-primary">
            {dateFormatter.format(now)}
          </p>
          <p className="metric-number mt-0.5 text-sm font-semibold text-foreground">
            {timeFormatter.format(now)} hrs
          </p>
        </div>
        <AccountContextMenu {...account} />
      </div>
    </div>
  );
}
