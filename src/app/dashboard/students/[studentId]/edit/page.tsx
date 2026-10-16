import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { StudentEditForm } from "./student-edit-form";
import { StudentWorkspace } from "../../student-workspace";
import { parseStudentListQuery, studentListHref, studentLinkClass, type StudentListParams } from "@/presentation/navigation/student-navigation";

export default async function StudentEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<StudentListParams>;
}) {
  const membership = await requireOperationalMembership();
  const query = parseStudentListQuery(await searchParams);
  if (membership.role === "assistant") redirect(studentListHref(query));
  const { studentId } = await params;
  const operations = await createInstructorOperationsDeps();
  const student = await operations.students.findAdministrationRowById(
    membership.tenantId,
    studentId,
  );
  if (!student) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Datos básicos
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
            {student.fullName}
          </h2>
        </div>
        <Link
          href={studentListHref(query)}
          className={studentLinkClass}
        >
          Volver a alumnos
        </Link>
      </div>
      <StudentWorkspace><StudentEditForm
        query={query}
        student={{
          id: student.id,
          fullName: student.fullName,
          birthDate: student.birthDate,
          photoUrl: student.photoUrl,
          gender: student.gender,
          heightCm: student.heightCm,
          weightKg: student.weightKg,
          emergencyContactName: student.emergencyContactName,
          emergencyContactEmail: student.emergencyContactEmail,
          emergencyContactPhone: student.emergencyContactPhone,
          contactEmail: student.contactEmail,
          contactPhone: student.contactPhone,
        }}
      /></StudentWorkspace>
    </div>
  );
}
