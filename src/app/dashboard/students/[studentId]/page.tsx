import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentHealthHistory } from "@/application/evolution-health-attendance/use-cases/manage-student-health";
import { getStudentPrivacyState } from "@/application/evolution-health-attendance/use-cases/manage-student-privacy";
import { listCurrentMemberships } from "@/application/instructor-finance/use-cases/manage-membership";
import { getMembershipBalance } from "@/application/instructor-finance/use-cases/manage-payment";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { AppShell, ProductMark } from "@/presentation/components/app-shell";
import { QuickActionMenu } from "@/presentation/components/quick-action-menu";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/presentation/components/primary-navigation";
import { StatusBadge, Surface } from "@/presentation/components/primitives";
import { formatMoney } from "@/lib/format-money";
import {
  ConsentForm,
  ErasureRequestForm,
  MembershipForm,
  PersonalDataCorrectionForm,
  RestrictionForm,
} from "./student-detail-forms";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const membership = await requireOperationalMembership();
  const tenantId = membership.tenantId;
  const { studentId } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const [operations, finance, health] = await Promise.all([
    createInstructorOperationsDeps(),
    createInstructorFinanceDeps(),
    createEvolutionHealthAttendanceDeps(),
  ]);
  const student = await operations.students.findById(tenantId, studentId);
  if (!student) notFound();
  const canManageSensitiveData = membership.role !== "assistant";
  const privacy = canManageSensitiveData
    ? await getStudentPrivacyState({ tenantId, studentId }, health)
    : null;
  const canAccessHealth = Boolean(
    privacy?.healthEnabled && privacy.hasCurrentConsent,
  );
  const [plans, memberships, history] = await Promise.all([
    finance.memberships.findActivePlans(tenantId),
    listCurrentMemberships({ tenantId, studentId, onDate: today }, finance),
    canAccessHealth
      ? getStudentHealthHistory({ tenantId, studentId }, health)
      : Promise.resolve({ conditions: [], injuries: [], restrictions: [] }),
  ]);
  const activeRestrictions = history.restrictions.filter(
    (item) => item.status === "active",
  );
  const balanceEntries = canManageSensitiveData
    ? await Promise.all(
        memberships.map(async (item) => {
          const balance = await getMembershipBalance(
            { tenantId, membershipId: item.id },
            finance,
          );
          return [item.id, balance.balance] as const;
        }),
      )
    : [];
  const balances = Object.fromEntries(balanceEntries);
  const roleLabel =
    membership.role === "owner"
      ? "Dueño"
      : membership.role === "assistant"
        ? "Asistente"
        : membership.role === "admin"
          ? "Administrador"
          : membership.role;

  return (
    <AppShell
      sidebarHeader={<ProductMark context={roleLabel} />}
      navigation={<DesktopNavigation role={membership.role} />}
      mobileNavigation={
        <MobileNavigation
          role={membership.role}
          quickAction={<QuickActionMenu role={membership.role} />}
        />
      }
      topbar={
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Alumno
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {student.fullName}
            </h1>
          </div>
          <Link
            href="/dashboard/students"
            className="text-sm font-semibold text-primary"
          >
            Volver a alumnos
          </Link>
        </div>
      }
      topbarActions={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-foreground"
            aria-label="Seleccionar tenant"
          >
            <span
              className="h-2 w-2 rounded-full bg-success"
              aria-hidden="true"
            />
            {roleLabel}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-foreground"
            aria-label="Cuenta"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {membership.role.slice(0, 1).toUpperCase()}
            </span>
            Cuenta
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-2">
          {canManageSensitiveData ? (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Membresía</h2>
              {memberships.length > 0 ? (
                memberships.map((membershipItem) => (
                  <Surface key={membershipItem.id} className="mb-3">
                    <StatusBadge
                      tone={
                        membershipItem.status === "past_due"
                          ? "warning"
                          : "success"
                      }
                    >
                      {membershipItem.status === "past_due"
                        ? "En mora"
                        : "Activa"}
                    </StatusBadge>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {membershipItem.agreedPrice} {membershipItem.currency} ·
                      próxima fecha {membershipItem.nextBillingDate}
                    </p>
                    <p className="metric-number mt-2 text-lg font-semibold">
                      Saldo{" "}
                      {formatMoney(
                        balances[membershipItem.id] ?? 0,
                        membershipItem.currency,
                      )}
                    </p>
                    {(balances[membershipItem.id] ?? 0) > 0 ? (
                      <Link
                        href="/dashboard/finance?section=collections"
                        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
                      >
                        Registrar cobro
                      </Link>
                    ) : null}
                  </Surface>
                ))
              ) : (
                <MembershipForm
                  studentId={studentId}
                  plans={plans}
                  startsOn={today}
                />
              )}
              {memberships.length === 0 && plans.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Crea un plan de membresía antes de asignarlo.
                </p>
              ) : null}
            </section>
          ) : null}
          {canAccessHealth ? (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Alertas operativas</h2>
              {activeRestrictions.map((restriction) => (
                <article
                  key={restriction.id}
                  className="mb-3 grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10"
                >
                  <span
                    className={`mt-1 h-3 w-3 rounded-full ${restriction.severity === "red" ? "bg-destructive" : restriction.severity === "yellow" ? "bg-warning" : "bg-success"}`}
                    aria-label={`Nivel ${restriction.severity}`}
                  />
                  <div>
                    <p className="font-semibold">{restriction.description}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {restriction.operationalAction}
                    </p>
                  </div>
                </article>
              ))}
              <RestrictionForm studentId={studentId} startsOn={today} />
            </section>
          ) : null}
          {canManageSensitiveData && privacy ? (
            <section className="grid content-start gap-3 lg:col-span-2">
              <div>
                <h2 className="text-xl font-semibold">Privacidad y salud</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Política {privacy.policyVersion ?? "sin configurar"}
                  {privacy.jurisdictionCode
                    ? ` · ${privacy.jurisdictionCode}`
                    : ""}
                </p>
              </div>
              {!privacy.healthEnabled ? (
                <Surface role="status">
                  <p className="font-semibold">Datos de salud bloqueados</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    La política jurisdiccional aún no está aprobada y activa.
                  </p>
                </Surface>
              ) : privacy.policyVersion ? (
                <ConsentForm
                  studentId={studentId}
                  policyVersion={privacy.policyVersion}
                  hasCurrentConsent={privacy.hasCurrentConsent}
                />
              ) : null}
              {privacy.healthEnabled ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <PersonalDataCorrectionForm
                    studentId={studentId}
                    fullName={student.fullName}
                    birthDate={student.birthDate}
                  />
                  <div className="grid content-start gap-3">
                    <a
                      href={`/api/students/${studentId}/personal-data`}
                      className="flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 font-semibold text-foreground transition-colors hover:bg-surface-raised"
                    >
                      Exportar datos personales
                    </a>
                  </div>
                </div>
              ) : null}
              {privacy.erasureRequest ? (
                <Surface role="status" className="text-sm">
                  Solicitud de eliminación: {privacy.erasureRequest.status}.
                  Ejecución no anterior al{" "}
                  {privacy.erasureRequest.executeAfter.toLocaleDateString("es")}
                  .
                </Surface>
              ) : (
                <ErasureRequestForm studentId={studentId} />
              )}
            </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
