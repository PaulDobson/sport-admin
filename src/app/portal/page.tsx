import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createStudentPortalDeps } from "@/infrastructure/composition/student-portal-composition";
import {
  listMyStudentPortalStudents,
  listStudentPortalSessions,
} from "@/application/student-portal/use-cases/student-portal";
import { EmptyState } from "@/presentation/components/primitives";
import { SessionEnrollmentForm } from "./session-enrollment-form";
import { signOutStudentPortalAction } from "./actions";
import Link from "next/link";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

export default async function StudentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const auth = await createAuthDeps();
  if (!(await auth.auth.getCurrentUserId())) redirect("/log-in");
  const portal = await createStudentPortalDeps();
  const students = await listMyStudentPortalStudents({ portal: portal.portal });
  if (students.length === 0) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 py-16 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Sport Admin · Portal deportivo
        </p>
        <h1 className="mt-3 text-3xl font-extrabold">
          Tu acceso está casi listo
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Confirma una invitación válida de tu academia para vincular tu ficha.
        </p>
        <Link
          href="/log-in"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          Volver al ingreso
        </Link>
      </main>
    );
  }

  const params = await searchParams;
  const activeStudent =
    students.find((student) => student.id === params.studentId) ?? students[0];
  const sessions = await listStudentPortalSessions(activeStudent.id, {
    portal: portal.portal,
  });

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {activeStudent.tenantName}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">
            Hola, {activeStudent.fullName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Revisa tus sesiones y reserva tu próximo entrenamiento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {students.length > 1 ? (
            <nav
              aria-label="Fichas vinculadas"
              className="flex flex-wrap gap-2"
            >
              {students.map((student) => (
                <Link
                  key={`${student.tenantId}:${student.id}`}
                  href={
                    student.id === activeStudent.id
                      ? "/portal"
                      : `/portal?studentId=${student.id}`
                  }
                  aria-current={
                    student.id === activeStudent.id ? "page" : undefined
                  }
                  className={
                    student.id === activeStudent.id
                      ? "inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground"
                      : "inline-flex min-h-10 items-center rounded-lg bg-card px-3 text-sm font-semibold text-foreground hover:bg-surface-raised"
                  }
                >
                  {student.fullName}
                </Link>
              ))}
            </nav>
          ) : null}
          <form action={signOutStudentPortalAction}>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-card hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <section className="mt-9" aria-labelledby="available-sessions-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Tu agenda
            </p>
            <h2
              id="available-sessions-heading"
              className="mt-1 text-xl font-bold"
            >
              Próximas sesiones
            </h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {sessions.length} sesiones publicadas
          </span>
        </div>

        {sessions.length > 0 ? (
          <div className="divide-y divide-white/5 overflow-hidden rounded-xl bg-card/65">
            {sessions.map((session) => (
              <article key={session.id}>
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{session.className}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                      <time dateTime={session.startsAt.toISOString()}>
                        {dateFormatter.format(session.startsAt)}
                      </time>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin aria-hidden="true" className="h-4 w-4" />
                      {session.locationName}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <UsersRound aria-hidden="true" className="h-4 w-4" />
                      {session.confirmedCount}/{session.capacity} cupos
                      {session.waitlistedCount > 0
                        ? ` · ${session.waitlistedCount} en espera`
                        : ""}
                    </p>
                  </div>
                </div>
                <SessionEnrollmentForm session={session} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No hay sesiones publicadas"
            description="Cuando tu academia publique nuevas sesiones, aparecerán aquí para que puedas reservar."
          />
        )}
      </section>
    </main>
  );
}
