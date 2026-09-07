"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, UserRound } from "lucide-react";
import { selectTenantAction } from "@/app/select-tenant/actions";
import { signOutAction } from "@/app/dashboard/profile/sign-out-action";

export interface TenantContextOption {
  id: string;
  name: string;
}

export interface LocationContextOption {
  id: string;
  name: string;
}

export function AccountContextMenu({
  profileName,
  currentTenantId,
  tenants,
  roleLabel,
  locations = [],
  currentLocationId = "",
}: {
  profileName: string;
  currentTenantId: string;
  tenants: TenantContextOption[];
  roleLabel: string;
  locations?: LocationContextOption[];
  currentLocationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const initials =
    profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SA";
  const currentTenant = tenants.find((tenant) => tenant.id === currentTenantId);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Cuenta de ${profileName}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-left text-xs font-semibold text-foreground shadow-sm shadow-black/10 transition-colors hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {initials}
        </span>
        <span className="hidden max-w-28 truncate sm:block">{profileName}</span>
        <ChevronDown
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Menú de cuenta"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/20"
        >
          <div className="border-b border-border/70 px-2 pb-3">
            <p className="font-semibold">{profileName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
            <p className="mt-2 truncate text-xs font-semibold text-foreground">
              {currentTenant?.name ?? "Organización activa"}
            </p>
          </div>
          <div className="border-b border-border/70 py-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Organización
            </p>
            {tenants.map((tenant) => (
              <form key={tenant.id} action={selectTenantAction}>
                <input type="hidden" name="tenantId" value={tenant.id} />
                <button
                  type="submit"
                  role="menuitem"
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-sm hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-success"
                      aria-hidden="true"
                    />
                    <span className="truncate">{tenant.name}</span>
                  </span>
                  {tenant.id === currentTenantId ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-label="Activo"
                    />
                  ) : null}
                </button>
              </form>
            ))}
            {!currentTenant ? (
              <p className="px-2 text-xs text-muted-foreground">
                Organización activa
              </p>
            ) : null}
          </div>
          <div className="pt-2">
            <a
              href="/dashboard/profile"
              role="menuitem"
              className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <UserRound
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              Perfil y cuenta
            </a>
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex min-h-10 w-full items-center rounded-lg px-2 text-left text-sm text-destructive hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Cerrar sesión
              </button>
            </form>
            {locations.length > 0 ? (
              <form action="/dashboard" method="get" className="px-2 pt-2">
                <label className="flex items-center gap-2">
                  <MapPin
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Locación activa</span>
                  <select
                    name="location"
                    defaultValue={currentLocationId}
                    aria-label="Locación activa"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background/50 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onChange={(event) =>
                      event.currentTarget.form?.requestSubmit()
                    }
                  >
                    <option value="">Todas las locaciones</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
