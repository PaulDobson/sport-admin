import Link from "next/link";
import { redirect } from "next/navigation";
import { getInstructorDay } from "@/application/instructor-operations/use-cases/get-instructor-day";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { loadOperationalContext } from "@/app/_lib/operational-context";
import { AccountContextMenu } from "@/presentation/components/account-context-menu";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import {
  EmptyState,
  StatusBadge,
  Surface,
} from "@/presentation/components/primitives";

interface SchedulePageProps {
  searchParams: Promise<{ location?: string }>;
}

const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default async function SchedulePage({
  searchParams,
}: SchedulePageProps) {
  const context = await loadOperationalContext();
  if (context.status === "unauthenticated") redirect("/log-in");
  if (context.status === "no-membership") redirect("/onboarding");
  if (context.status === "selection-required") redirect("/select-tenant");
  if (context.status === "no-operational-tenant") redirect("/dashboard");

  const membership = context.membership;
  const { location } = await searchParams;
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const operations = await createInstructorOperationsDeps();
  const [day, profile, tenants] = await Promise.all([
    getInstructorDay(
      { tenantId: membership.tenantId, locationId: location, now: new Date() },
      operations,
    ),
    auth.profiles.findByUserId(userId),
    auth.tenants.findOperationalByUser(userId),
  ]);
  const roleLabel =
    membership.role === "owner"
      ? "Dueño"
      : membership.role === "assistant"
        ? "Asistente"
        : membership.role === "admin"
          ? "Administrador"
          : membership.role;
  const sessions = [
    ...(day.currentSession ? [day.currentSession] : []),
    ...day.upcomingSessions,
  ];

  return (
    <AppShell
      sidebarHeader={<ProductMark context={roleLabel} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={
            <QuickActionMenu
              role={membership.role}
              currentSessionId={day.currentSession?.id}
            />
          }
        />
      }
      topbar={
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Operación
          </p>
          <h1 className="text-xl font-semibold sm:text-2xl">Agenda</h1>
        </div>
      }
      topbarActions={
        <AccountContextMenu
          profileName={profile?.fullName || "Tu cuenta"}
          currentTenantId={membership.tenantId}
          roleLabel={roleLabel}
          tenants={tenants.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
          }))}
          locations={day.locations}
          currentLocationId={location}
        />
      }
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm capitalize text-muted-foreground">
              {dateFormatter.format(new Date())}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Revisa capacidad, locación y acceso a asistencia.
            </p>
          </div>
          <form method="get" className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Locación
              <select
                name="location"
                defaultValue={location ?? ""}
                className="h-10 min-w-40 rounded-lg border border-input bg-background/50 px-3 text-sm font-normal tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas</option>
                {day.locations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Filtrar
            </button>
          </form>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isCurrent = session.id === day.currentSession?.id;
              return (
                <article
                  key={session.id}
                  className={`rounded-xl border bg-card p-5 shadow-lg shadow-black/10 ${isCurrent ? "border-primary" : "border-border"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        {isCurrent ? (
                          <StatusBadge tone="success">En curso</StatusBadge>
                        ) : null}
                        <span className="text-sm text-muted-foreground">
                          {timeFormatter.format(session.startsAt)} -{" "}
                          {timeFormatter.format(session.endsAt)}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold">{session.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {session.locationName}
                      </p>
                    </div>
                    <p className="text-right">
                      <span className="metric-number block text-2xl font-semibold">
                        {session.confirmedCount}/{session.capacity}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        confirmados
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/sessions/${session.id}/attendance`}
                    className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Tomar asistencia
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Agenda despejada"
            description="No hay sesiones abiertas para esta locación."
            action={
              location ? (
                <Link
                  href="/dashboard/schedule"
                  className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-surface-raised"
                >
                  Ver todas las locaciones
                </Link>
              ) : null
            }
          />
        )}
      </div>
    </AppShell>
  );
}
