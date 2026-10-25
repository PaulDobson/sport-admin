import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { listAssignablePlansAction } from "@/app/dashboard/finance/actions";
import { Surface } from "@/presentation/components/primitives";
import {
  parseStudentListQuery,
  studentListHref,
  type StudentListParams,
} from "@/presentation/navigation/student-navigation";
import { StudentForm } from "../student-form";
import { StudentWorkspace } from "../student-workspace";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<StudentListParams>;
}) {
  const membership = await requireOperationalMembership();
  const query = parseStudentListQuery(await searchParams);
  if (membership.role === "assistant") redirect(studentListHref(query));
  const plans = await listAssignablePlansAction();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Hero header — same visual language as /dashboard/schedule */}
      <Surface className="border-primary/30 bg-linear-to-br from-primary/20 via-primary/5 to-card p-5 sm:p-7">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          Registro de alumno
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Nuevo alumno
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Solo el nombre es obligatorio. Completa el resto del perfil cuando lo
          necesites.
        </p>
      </Surface>

      <StudentWorkspace>
        <StudentForm query={query} plans={plans} />
      </StudentWorkspace>
    </div>
  );
}
