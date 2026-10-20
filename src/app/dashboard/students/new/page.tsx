import { redirect } from "next/navigation";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { parseStudentListQuery, studentListHref, type StudentListParams } from "@/presentation/navigation/student-navigation";
import { StudentForm } from "../student-form";
import { StudentWorkspace } from "../student-workspace";

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<StudentListParams> }) {
  const membership = await requireOperationalMembership();
  const query = parseStudentListQuery(await searchParams);
  if (membership.role === "assistant") redirect(studentListHref(query));
  return <div className="mx-auto max-w-3xl space-y-5"><div><h2 className="text-2xl font-bold tracking-tight">Nuevo alumno</h2><p className="mt-1 text-sm text-muted-foreground">Empieza con sus datos básicos y completa el perfil cuando lo necesites.</p></div><StudentWorkspace><StudentForm query={query} /></StudentWorkspace></div>;
}
