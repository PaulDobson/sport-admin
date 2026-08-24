import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { StudentForm } from "./student-form";

export default async function StudentsPage() {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) redirect("/log-in");
  const memberships = await auth.memberships.findOperationalByUser(userId);
  if (memberships.length === 0) redirect("/onboarding");

  const operations = await createInstructorOperationsDeps();
  const students = await operations.students.findActiveByTenant(
    memberships[0].tenantId,
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <Link
          href="/dashboard"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Volver al panel
        </Link>
        <p className="mb-1 text-sm font-medium text-primary">Alumnos</p>
        <h1 className="text-3xl font-semibold">Alumnos activos</h1>
      </header>

      <section className="mb-8" aria-labelledby="new-student-heading">
        <h2 id="new-student-heading" className="mb-3 text-xl font-semibold">
          Nuevo alumno
        </h2>
        <StudentForm />
      </section>

      <section aria-labelledby="student-list-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="student-list-heading" className="text-xl font-semibold">
            Listado
          </h2>
          <span className="text-sm text-muted-foreground">
            {students.length} activos
          </span>
        </div>
        {students.length > 0 ? (
          <div className="surface-panel px-4">
            {students.map((student) => (
              <article
                key={student.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{student.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {student.birthDate ?? "Nacimiento no registrado"}
                  </p>
                </div>
                <Link
                  href={`/dashboard/students/${student.id}`}
                  className="text-sm font-semibold text-primary"
                >
                  Abrir
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-y border-border py-8 text-center text-muted-foreground">
            Agrega tu primer alumno para comenzar.
          </p>
        )}
      </section>
    </main>
  );
}
