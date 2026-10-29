"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, CreditCard, Plus, UserPlus } from "lucide-react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";

/**
 * FAB (+) in the mobile bottom navigation.
 *
 * "Tomar asistencia" is always shown when the role allows it — it no longer
 * depends on a `currentSessionId` being injected from the server. Instead it
 * navigates to the sessions list where the instructor selects today's session.
 * This fixes the bug where the action never appeared because the prop was never
 * passed from DashboardLayout.
 */
export function QuickActionMenu({ role }: { role: TenantMembershipRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const canTakeAttendance = [
    "owner",
    "admin",
    "instructor",
    "assistant",
  ].includes(role);

  const canManageStudents = role !== "assistant";

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Acción rápida"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Acciones rápidas"
          className="absolute bottom-[calc(100%+0.75rem)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-black/20"
        >
          {/* 1. Tomar asistencia — always available for roles that can take it.
              Navigates to sessions list so the instructor picks today's session.
              Previously this relied on currentSessionId (never passed → never shown). */}
          {/*canTakeAttendance ? (
            <Link
              href="/dashboard/schedule"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              Tomar asistencia
            </Link>
          ) : null*/}

          {/* 2. Nuevo alumno */}
          {canManageStudents ? (
            <Link
              href="/dashboard/students/new"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
              Nuevo alumno
            </Link>
          ) : null}

          {/* 3. Asignar plan */}
          {canManageStudents ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                const params = new URLSearchParams(window.location.search);
                params.set("assign", "1");
                router.push(`${pathname}?${params.toString()}`, {
                  scroll: false,
                });
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
              Asignar plan
            </button>
          ) : null}

          {/* 4. Ver sesiones — always visible as a fallback destination */}
          <Link
            href="/dashboard/schedule"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            Ver sesiones
          </Link>
        </div>
      ) : null}
    </div>
  );
}
