import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStudentHealthHistory } from "@/application/evolution-health-attendance/use-cases/manage-student-health";
import { listCurrentMemberships } from "@/application/instructor-finance/use-cases/manage-membership";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createEvolutionHealthAttendanceDeps } from "@/infrastructure/composition/evolution-health-attendance-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { MembershipForm, RestrictionForm } from "./student-detail-forms";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const actors = await auth.memberships.findOperationalByUser(userId);
  if (actors.length === 0) redirect("/onboarding");
  const tenantId = actors[0].tenantId;
  const { studentId } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const [operations, finance, health] = await Promise.all([
    createInstructorOperationsDeps(),
    createInstructorFinanceDeps(),
    createEvolutionHealthAttendanceDeps(),
  ]);
  const student = await operations.students.findById(tenantId, studentId);
  if (!student) notFound();
  const canAccessHealth = actors[0].role !== "assistant";
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

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <Link
          href="/dashboard/students"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Volver a alumnos
        </Link>
        <p className="mb-1 text-sm font-medium text-primary">Alumno</p>
        <h1 className="text-3xl font-semibold">{student.fullName}</h1>
      </header>
      <div className="grid gap-8 lg:grid-cols-2">
        {canAccessHealth ? (
          <section>
            <h2 className="mb-3 text-xl font-semibold">Membresía</h2>
            {memberships.length > 0 ? (
              memberships.map((membership) => (
                <article key={membership.id} className="surface-panel mb-3 p-4">
                  <p className="font-semibold">
                    {membership.status === "past_due" ? "En mora" : "Activa"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {membership.agreedPrice} {membership.currency} · próxima
                    fecha {membership.nextBillingDate}
                  </p>
                </article>
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
        <section>
          <h2 className="mb-3 text-xl font-semibold">Alertas operativas</h2>
          {activeRestrictions.map((restriction) => (
            <article
              key={restriction.id}
              className="surface-panel mb-3 grid grid-cols-[auto_1fr] gap-3 p-4"
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
      </div>
    </main>
  );
}
