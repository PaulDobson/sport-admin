import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getStudentHealthHistory } from "@/application/evolution-health-attendance/use-cases/manage-student-health";
import { getStudentPrivacyState } from "@/application/evolution-health-attendance/use-cases/manage-student-privacy";
import {
  getStudentAttendanceMonthlySummary,
  getStudentAttendanceMonthDetail,
} from "@/application/evolution-health-attendance/use-cases/get-student-attendance-history";
import { getMetricHistory } from "@/application/evolution-health-attendance/use-cases/get-metric-history";
import { ensureDefaultMetricDefinitions } from "@/application/evolution-health-attendance/use-cases/list-metric-definitions";
import {
  listCurrentMemberships,
  listMembershipPlans,
} from "@/application/instructor-finance/use-cases/manage-membership";
import { getMembershipBalance } from "@/application/instructor-finance/use-cases/manage-payment";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import {
  Avatar,
  StatusBadge,
  Surface,
} from "@/presentation/components/primitives";
import {
  parseStudentListQuery,
  studentListHref,
  studentTaskHref,
  studentLinkClass,
  type StudentListParams,
} from "@/presentation/navigation/student-navigation";
import { formatMoney } from "@/lib/format-money";
import { StudentContact, StudentStatus } from "../student-list";
import { StudentWorkspace } from "../student-workspace";
import { StudentArchiveButton } from "../student-archive-button";
import { StudentPortalInviteButton } from "./student-portal-invite-button";
import {
  ConsentForm,
  ErasureRequestForm,
  PersonalDataCorrectionForm,
  RestrictionForm,
} from "./student-detail-forms";
import { AssignMembershipSheet } from "../../finance/assign-membership-sheet";
import { ChangeMembershipSheet } from "../../finance/change-membership-sheet";
import { StudentAttendanceHistory } from "../student-attendance-history";
import { StudentEvolutionHistory } from "../student-evolution-history";
import { StudentEvolutionCharts } from "../student-evolution-charts";

const primaryActionClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<
    StudentListParams & { section?: string; am?: string; ay?: string }
  >;
}) {
  const membership = await requireOperationalMembership();
  const { studentId } = await params;
  const search = await searchParams;
  const query = parseStudentListQuery(search);
  const canManage = membership.role !== "assistant";
  const section =
    canManage &&
    (search.section === "membership" ||
      search.section === "health" ||
      search.section === "privacy" ||
      search.section === "attendance" ||
      search.section === "evolution")
      ? search.section
      : "summary";

  const operations = await createInstructorOperationsDeps();
  const student = await operations.students.findAdministrationRowById(
    membership.tenantId,
    studentId,
  );
  if (!student) notFound();

  const tenantId = membership.tenantId;
  const today = new Date().toISOString().slice(0, 10);
  const detailHref = studentTaskHref(`/dashboard/students/${studentId}`, query);

  // ─── Health/attendance/evolution deps (single client, reused across branches) ───
  const needsHealth =
    section === "health" ||
    section === "privacy" ||
    section === "attendance" ||
    section === "evolution" ||
    section === "summary";

  const health = needsHealth
    ? await createEvolutionHealthAttendanceDeps()
    : null;

  // Parse selected month from URL params (am = month 1-12, ay = year)
  // Needed here so attendance parallel fetch can use it directly.
  const activeMonth = search.am ? parseInt(search.am, 10) : null;
  const activeYear = search.ay ? parseInt(search.ay, 10) : null;

  // ─── All section data fetched in parallel where possible ────────────────────
  //
  // summary  → privacy + definitions + metric history run concurrently
  // attendance → summary + detail run concurrently (detail uses URL params if
  //              already present, otherwise we do a second request below)
  // evolution → definitions seeding + metric history run concurrently
  // health   → privacy first (gate), then history only if access is granted
  // membership → memberships + plans run concurrently; balances in allSettled
  //
  // Sections that are not active resolve to null immediately via Promise.resolve.

  const [
    privacy,
    summaryEvolutionDefs,
    summaryEvolutionHistory,
    attendanceSummaryResult,
    attendanceDetailFromParams,
    evolutionDefs,
    evolutionHistory,
    finance,
  ] = await Promise.all([
    // privacy is needed by summary, health, privacy, and evolution sections
    health
      ? getStudentPrivacyState({ tenantId, studentId }, health)
      : Promise.resolve(null),

    // summary charts — independent of privacy state
    section === "summary" && health
      ? health.metrics.listAllActiveDefinitions(tenantId).catch(() => [])
      : Promise.resolve(null),

    section === "summary" && health
      ? getMetricHistory({ tenantId, studentId }, health).catch(() => [])
      : Promise.resolve(null),

    // attendance summary
    section === "attendance" && health
      ? getStudentAttendanceMonthlySummary({ tenantId, studentId }, health)
      : Promise.resolve(null),

    // attendance detail — only when month/year are already in the URL params
    section === "attendance" && health && activeMonth && activeYear
      ? getStudentAttendanceMonthDetail(
          { tenantId, studentId, year: activeYear, month: activeMonth },
          health,
        )
      : Promise.resolve(null),

    // evolution: definitions + history run concurrently
    section === "evolution" && health
      ? ensureDefaultMetricDefinitions({ tenantId }, health).catch(() => [])
      : Promise.resolve(null),

    section === "evolution" && health
      ? getMetricHistory({ tenantId, studentId }, health).catch(() => [])
      : Promise.resolve(null),

    // membership finance deps
    section === "membership"
      ? createInstructorFinanceDeps()
      : Promise.resolve(null),
  ]);

  const canAccessHealth = Boolean(
    privacy?.healthEnabled && privacy.hasCurrentConsent,
  );

  // health history requires privacy gate — must be sequential
  const history =
    section === "health" && canAccessHealth && health
      ? await getStudentHealthHistory({ tenantId, studentId }, health)
      : null;

  // Resolve attendance detail: prefer the parallel result (already loaded when
  // month params were in the URL); otherwise fall back to the most-recent month
  // from the summary (requires a second sequential fetch only when no params).
  const detailMonth =
    activeMonth && activeYear
      ? { year: activeYear, month: activeMonth }
      : attendanceSummaryResult?.[0]
        ? {
            year: attendanceSummaryResult[0].year,
            month: attendanceSummaryResult[0].month,
          }
        : null;

  const attendanceSummary = attendanceSummaryResult;

  const attendanceDetail =
    attendanceDetailFromParams ??
    (section === "attendance" && health && detailMonth && !activeMonth
      ? await getStudentAttendanceMonthDetail(
          { tenantId, studentId, ...detailMonth },
          health,
        )
      : null);

  // ─── Membership: balances + plan names in parallel ───────────────────────
  const memberships = finance
    ? await listCurrentMemberships(
        { tenantId, studentId, onDate: today },
        finance,
      )
    : [];

  const balances: Record<string, number> = {};
  const planNames: Record<string, string> = {};

  if (finance && memberships.length > 0) {
    // balances and plan names are independent — fetch concurrently
    const [balanceResults, plans] = await Promise.all([
      Promise.allSettled(
        memberships.map((item) =>
          getMembershipBalance({ tenantId, membershipId: item.id }, finance),
        ),
      ),
      listMembershipPlans({ tenantId }, finance).catch(() => []),
    ]);

    for (let i = 0; i < memberships.length; i++) {
      const result = balanceResults[i];
      balances[memberships[i].id] =
        result.status === "fulfilled" ? result.value.balance : 0;
    }
    for (const plan of plans) {
      planNames[plan.id] = plan.name;
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/*
        key removed — StudentWorkspace should survive section changes. Its
        internal state (pending/dirty guards) is unrelated to which section is
        displayed. Recreating it on every tab change destroys guard state and
        causes a DOM flash.
      */}
      <StudentWorkspace>
        <Link
          href={studentListHref(query)}
          className={`${studentLinkClass} mb-4`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a alumnos
        </Link>
        <Surface className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
              <Avatar
                name={student.fullName}
                src={student.photoUrl}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ficha del alumno
                </p>
                <h2 className="mt-1 text-2xl font-bold wrap-anywhere">
                  {student.fullName}
                </h2>
                <div className="mt-2">
                  <StudentStatus status={student.status} />
                </div>
              </div>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={studentTaskHref(
                    `/dashboard/students/${studentId}/edit`,
                    query,
                  )}
                  className={studentLinkClass}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Editar alumno
                </Link>
                {student.status === "active" ? (
                  <StudentArchiveButton
                    studentId={studentId}
                    studentName={student.fullName}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          {student.status === "archived" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Este alumno está archivado. Su historial se conserva.
            </p>
          ) : null}
        </Surface>

        <nav
          aria-label="Secciones de la ficha"
          className="mb-5 flex flex-wrap gap-2"
        >
          {(
            [
              ["summary", "Resumen"],
              ...(canManage
                ? [
                    ["membership", "Membresía"],
                    ["attendance", "Asistencia"],
                    ["evolution", "Evolución"],
                    ["health", "Salud"],
                    ["privacy", "Privacidad"],
                  ]
                : []),
            ] as [string, string][]
          ).map(([value, label]) => (
            <Link
              key={value}
              href={`${detailHref}&section=${value}`}
              aria-current={section === value ? "page" : undefined}
              className={`${studentLinkClass} ${
                section === value
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "bg-card text-muted-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {section === "summary" ? (
          <div className="space-y-5">
            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              <Surface className="min-w-0">
                <h3 className="text-lg font-semibold">Datos del alumno</h3>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Nacimiento</dt>
                    <dd className="mt-1 font-medium">
                      {student.birthDate ?? "No registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Género</dt>
                    <dd className="mt-1 font-medium">
                      {student.gender === "female"
                        ? "Femenino"
                        : student.gender === "male"
                          ? "Masculino"
                          : student.gender === "other"
                            ? "Otro"
                            : "Sin especificar"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Estatura</dt>
                    <dd className="mt-1 font-medium">
                      {student.heightCm === null
                        ? "No registrada"
                        : `${student.heightCm} cm`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Peso</dt>
                    <dd className="mt-1 font-medium">
                      {student.weightKg === null
                        ? "No registrado"
                        : `${student.weightKg} kg`}
                    </dd>
                  </div>
                </dl>
                <h3 className="mb-3 mt-6 font-semibold">Contacto principal</h3>
                <StudentContact student={student} />
              </Surface>
              {canManage ? (
                <div className="min-w-0 space-y-5">
                  <Surface className="min-w-0">
                    <h3 className="text-lg font-semibold">
                      Contacto de emergencia
                    </h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      {(
                        [
                          ["Nombre", student.emergencyContactName],
                          ["Correo", student.emergencyContactEmail],
                          ["Teléfono", student.emergencyContactPhone],
                        ] as [string, string | null][]
                      ).map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="break-all font-medium">
                            {value ?? "No registrado"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </Surface>
                  <StudentPortalInviteButton studentId={studentId} />
                </div>
              ) : null}
            </div>

            {/* Evolution charts — only visible if there is recorded data */}
            {summaryEvolutionDefs && summaryEvolutionHistory && canManage ? (
              <StudentEvolutionCharts
                definitions={summaryEvolutionDefs}
                evaluations={summaryEvolutionHistory}
              />
            ) : null}
          </div>
        ) : null}

        {section === "membership" ? (
          <section aria-labelledby="membership-heading" className="space-y-4">
            <div>
              <h3 id="membership-heading" className="text-xl font-semibold">
                Membresía
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Planes, próximos vencimientos y saldo del alumno.
              </p>
            </div>
            {memberships.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {memberships.map((item) => (
                  <Surface key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <StatusBadge
                        tone={
                          item.status === "past_due" ? "warning" : "success"
                        }
                      >
                        {item.status === "past_due" ? "En mora" : "Activa"}
                      </StatusBadge>
                      {student.status === "active" ? (
                        <ChangeMembershipSheet
                          studentId={studentId}
                          studentName={student.fullName}
                          currentMembership={{
                            id: item.id,
                            planId: item.planId,
                            planName: planNames[item.planId] ?? "Plan actual",
                            agreedPrice: item.agreedPrice,
                            currency: item.currency,
                            billingCycle: item.billingCycle,
                            startsOn: item.startsOn,
                            expiresOn: item.expiresOn,
                            status: item.status,
                          }}
                          triggerClassName={studentLinkClass}
                          trigger="Cambiar plan"
                        />
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {planNames[item.planId]
                        ? `${planNames[item.planId]} · `
                        : ""}
                      {formatMoney(item.agreedPrice, item.currency)} · próxima
                      fecha {item.nextBillingDate}
                    </p>
                    <p className="metric-number mt-3 text-xl font-semibold">
                      Saldo {formatMoney(balances[item.id] ?? 0, item.currency)}
                    </p>
                    {(balances[item.id] ?? 0) > 0 ? (
                      <Link
                        href="/dashboard/finance?section=collections"
                        className={`${studentLinkClass} mt-4 text-primary`}
                      >
                        Registrar cobro
                      </Link>
                    ) : null}
                  </Surface>
                ))}
              </div>
            ) : (
              <Surface className="grid max-w-xl gap-3">
                <div>
                  <p className="font-semibold">Sin membresía vigente</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {student.status === "active"
                      ? "Asigna un plan y registra el primer pago en un solo paso."
                      : "Reactiva al alumno para asignarle un plan."}
                  </p>
                </div>
                {student.status === "active" ? (
                  <AssignMembershipSheet
                    trigger="Asignar plan"
                    triggerClassName={primaryActionClass}
                    initialStudent={{
                      id: studentId,
                      fullName: student.fullName,
                    }}
                  />
                ) : null}
              </Surface>
            )}
          </section>
        ) : null}

        {section === "attendance" ? (
          <section aria-labelledby="attendance-heading" className="space-y-5">
            <div>
              <h3 id="attendance-heading" className="text-xl font-semibold">
                Historial de asistencia
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Registros de asistencia confirmados en cada sesión.
              </p>
            </div>
            <StudentAttendanceHistory
              months={attendanceSummary ?? []}
              monthDetail={attendanceDetail}
              activeYear={detailMonth?.year ?? null}
              activeMonth={detailMonth?.month ?? null}
              baseHref={detailHref}
            />
          </section>
        ) : null}

        {section === "health" ? (
          <section aria-labelledby="health-heading" className="space-y-4">
            <h3 id="health-heading" className="text-xl font-semibold">
              Salud y alertas operativas
            </h3>
            {!canAccessHealth ? (
              <Surface>
                <h4 className="font-semibold">Datos de salud bloqueados</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  {!privacy?.healthEnabled
                    ? "La política de salud aún no está aprobada y activa."
                    : "Se requiere el consentimiento vigente del alumno o su tutor."}
                </p>
                <Link
                  href={`${detailHref}&section=privacy`}
                  className={`${studentLinkClass} mt-4`}
                >
                  Gestionar privacidad y consentimiento
                </Link>
              </Surface>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {history?.conditions
                    .filter(
                      (item) =>
                        item.status === "active" && item.name === "Alergias",
                    )
                    .map((item) => (
                      <Surface key={item.id}>
                        <h4 className="font-semibold">{item.name}</h4>
                        {item.notes ? (
                          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">
                            {item.notes}
                          </p>
                        ) : null}
                      </Surface>
                    ))}
                  {history?.restrictions
                    .filter((item) => item.status === "active")
                    .map((item) => (
                      <Surface key={item.id}>
                        <StatusBadge
                          tone={
                            item.severity === "red"
                              ? "destructive"
                              : item.severity === "yellow"
                                ? "warning"
                                : "success"
                          }
                        >
                          {item.severity === "red"
                            ? "Nivel rojo"
                            : item.severity === "yellow"
                              ? "Nivel amarillo"
                              : "Nivel verde"}
                        </StatusBadge>
                        <p className="mt-3 wrap-break-word font-semibold">
                          {item.description}
                        </p>
                        <p className="mt-1 wrap-break-word text-sm text-muted-foreground">
                          {item.operationalAction}
                        </p>
                      </Surface>
                    ))}
                  {!history?.restrictions.some(
                    (item) => item.status === "active",
                  ) &&
                  !history?.conditions.some(
                    (item) =>
                      item.status === "active" && item.name === "Alergias",
                  ) ? (
                    <Surface>
                      <p className="text-sm text-muted-foreground">
                        No hay alergias ni restricciones activas registradas.
                      </p>
                    </Surface>
                  ) : null}
                </div>
                <div>
                  <h4 className="mb-3 font-semibold">Registrar alerta</h4>
                  <RestrictionForm studentId={studentId} startsOn={today} />
                </div>
              </div>
            )}
          </section>
        ) : null}

        {section === "evolution" ? (
          <section aria-labelledby="evolution-heading" className="space-y-5">
            <div>
              <h3 id="evolution-heading" className="text-xl font-semibold">
                Evolución y evaluaciones físicas
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Composición corporal, fuerza, capacidad aeróbica y pruebas
                personalizadas.
              </p>
            </div>
            <StudentEvolutionHistory
              studentId={studentId}
              definitions={evolutionDefs ?? []}
              evaluations={evolutionHistory ?? []}
              todayStr={today}
            />
          </section>
        ) : null}

        {section === "privacy" && privacy ? (
          <section aria-labelledby="privacy-heading" className="space-y-5">
            <div>
              <h3 id="privacy-heading" className="text-xl font-semibold">
                Privacidad y consentimiento
              </h3>
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
                <p className="mt-2 text-sm text-muted-foreground">
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
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <h4 className="mb-3 font-semibold">
                    Corrección de datos personales
                  </h4>
                  <PersonalDataCorrectionForm
                    studentId={studentId}
                    fullName={student.fullName}
                    birthDate={student.birthDate}
                  />
                </div>
                <Surface>
                  <h4 className="font-semibold">Portabilidad de datos</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Descarga los datos personales de esta ficha.
                  </p>
                  <a
                    href={`/api/students/${studentId}/personal-data`}
                    download
                    className={`${studentLinkClass} mt-4`}
                  >
                    Exportar datos personales
                  </a>
                </Surface>
              </div>
            ) : null}
            <Surface>
              <h4 className="font-semibold">
                Solicitud de eliminación de datos
              </h4>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Este proceso de privacidad es distinto de archivar al alumno.
              </p>
              {privacy.erasureRequest ? (
                <p role="status" className="text-sm">
                  Solicitud de eliminación: {privacy.erasureRequest.status}.
                  Ejecución no anterior al{" "}
                  {privacy.erasureRequest.executeAfter.toLocaleDateString(
                    "es-CL",
                  )}
                  .
                </p>
              ) : (
                <ErasureRequestForm studentId={studentId} />
              )}
            </Surface>
          </section>
        ) : null}
      </StudentWorkspace>
    </div>
  );
}
