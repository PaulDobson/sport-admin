"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Plus } from "lucide-react";
import type { TenantMembershipRole } from "@/domain/tenants/tenant-membership";

export function QuickActionMenu({
  role,
  currentSessionId,
}: {
  role: TenantMembershipRole;
  currentSessionId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canTakeAttendance = [
    "owner",
    "admin",
    "instructor",
    "assistant",
  ].includes(role);

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
          {canTakeAttendance && currentSessionId ? (
            <Link
              href={`/dashboard/sessions/${currentSessionId}/attendance`}
              role="menuitem"
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              Abrir asistencia
            </Link>
          ) : null}
          <Link
            href="/dashboard/schedule"
            role="menuitem"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            Ver agenda
          </Link>
        </div>
      ) : null}
    </div>
  );
}
