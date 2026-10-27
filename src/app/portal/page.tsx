import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, UserCircle2 } from "lucide-react";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createStudentPortalDeps } from "@/infrastructure/composition/student-portal-composition";
import {
  listMyStudentPortalStudents,
  listStudentPortalSessions,
  listStudentPortalAttendanceHistory,
} from "@/application/student-portal/use-cases/student-portal";
import { PortalSchedule } from "./portal-schedule";
import { AttendanceHistory } from "./attendance-history";
import { PortalTabNav } from "./portal-tabs";
import type { PortalTab } from "./portal-tabs";
import { signOutStudentPortalAction } from "./actions";

export default async function StudentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; tab?: string }>;
}) {
  const auth = await createAuthDeps();
  if (!(await auth.auth.getCurrentUserId())) redirect("/log-in");

  const portal = await createStudentPortalDeps();
  const students = await listMyStudentPortalStudents({ portal: portal.portal });

  // ── No linked student ─────────────────────────────────────────────────────
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

  // ── Resolve active student + active tab ───────────────────────────────────
  const params = await searchParams;
  const activeStudent =
    students.find((s) => s.id === params.studentId) ?? students[0];
  const activeTab: PortalTab =
    params.tab === "history" ? "history" : "schedule";

  // Fetch the data needed for the active tab (the other tab fetches on demand
  // when the user navigates, keeping initial load fast).
  const [sessions, attendanceRecords] = await Promise.all([
    activeTab === "schedule"
      ? listStudentPortalSessions(activeStudent.id, { portal: portal.portal })
      : Promise.resolve([]),
    activeTab === "history"
      ? listStudentPortalAttendanceHistory(activeStudent.id, {
          portal: portal.portal,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/8 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <p className="grow truncate text-sm font-bold text-primary">
            {activeStudent.tenantName}
          </p>

          {/* Multi-gym switcher */}
          {students.length > 1 ? (
            <nav
              aria-label="Fichas vinculadas"
              className="flex shrink-0 gap-1.5"
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
                  className={[
                    "inline-flex min-h-8 items-center rounded-lg px-3 text-xs font-semibold transition-colors",
                    student.id === activeStudent.id
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                  ].join(" ")}
                >
                  {student.fullName.split(" ")[0]}
                </Link>
              ))}
            </nav>
          ) : null}

          <form action={signOutStudentPortalAction}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        {/* Student greeting */}
        <section className="mb-6 flex items-center gap-4" aria-label="Perfil">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <UserCircle2 aria-hidden="true" className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
              Hola, {activeStudent.fullName.split(" ")[0]}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeStudent.tenantName}
            </p>
          </div>
        </section>

        {/* Tab navigation */}
        <PortalTabNav
          activeTab={activeTab}
          baseHref="/portal"
          studentId={
            params.studentId && params.studentId !== students[0].id
              ? params.studentId
              : undefined
          }
        />

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === "schedule" ? (
            <PortalSchedule sessions={sessions} />
          ) : (
            <AttendanceHistory records={attendanceRecords} />
          )}
        </div>
      </main>
    </div>
  );
}
