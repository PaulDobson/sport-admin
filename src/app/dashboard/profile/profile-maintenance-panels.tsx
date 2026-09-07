import Link from "next/link";
import { Building2, Bell, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Surface } from "@/presentation/components/primitives";

function PanelHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
      </div>
    </div>
  );
}

export function ProfileMaintenancePanels({
  organizationName,
  roleLabel,
}: {
  organizationName: string;
  roleLabel: string;
}) {
  return (
    <aside className="space-y-4" aria-label="Mantenimiento de cuenta">
      <Surface aria-label="Organización" tone="raised">
        <PanelHeading
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          eyebrow="Organización"
          title={organizationName}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Rol operativo: {roleLabel}
        </p>
      </Surface>

      <Surface aria-label="Seguridad">
        <PanelHeading
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          eyebrow="Seguridad"
          title="Contraseña"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Gestiona el acceso de tu cuenta desde el flujo seguro de recuperación.
        </p>
        <Link
          href="/reset-password"
          className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-surface-raised"
        >
          Cambiar contraseña
        </Link>
      </Surface>

      <Surface aria-label="Notificaciones" tone="subtle">
        <PanelHeading
          icon={<Bell className="h-5 w-5" aria-hidden="true" />}
          eyebrow="Notificaciones"
          title="Sin configuración disponible"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          La configuración de notificaciones aparecerá cuando exista
          persistencia para guardarla.
        </p>
      </Surface>

      <Surface aria-label="Preferencias" tone="subtle">
        <PanelHeading
          icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
          eyebrow="Preferencias"
          title="Pendiente de soporte"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Solo se mostrarán controles editables cuando el producto pueda aplicar
          y recordar el cambio.
        </p>
      </Surface>
    </aside>
  );
}
