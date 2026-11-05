import Link from "next/link";

// ── Props ────────────────────────────────────────────────────────────────────

export interface ProfileMaintenancePanelsProps {
  organizationName: string;
  roleLabel: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProfileMaintenancePanels({
  organizationName,
  roleLabel,
}: ProfileMaintenancePanelsProps) {
  return (
    <aside aria-label="Mantenimiento de cuenta" className="space-y-4">
      {/* ── Organización ── */}
      <section aria-label="Organización" className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Organización
        </h2>
        <p className="text-sm text-muted-foreground">{organizationName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Rol operativo: {roleLabel}
        </p>
      </section>

      {/* ── Seguridad ── */}
      <section aria-label="Seguridad" className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Seguridad
        </h2>
        <Link
          href="/dashboard/profile/change-password"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Cambiar contraseña
        </Link>
      </section>

      {/* ── Notificaciones ── */}
      <section aria-label="Notificaciones" className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Notificaciones
        </h2>
        <p className="text-sm text-muted-foreground">
          Las preferencias de notificación se configuran desde la aplicación móvil.
        </p>
      </section>

      {/* ── Preferencias ── */}
      <section aria-label="Preferencias" className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Preferencias
        </h2>
        <p className="text-sm text-muted-foreground">
          Las preferencias de la aplicación se configuran desde la aplicación móvil.
        </p>
      </section>
    </aside>
  );
}
