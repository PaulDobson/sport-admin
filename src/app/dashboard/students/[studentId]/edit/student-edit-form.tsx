"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { parseStudentListQuery, studentTaskHref, studentLinkClass, type StudentListQuery } from "@/presentation/navigation/student-navigation";
import { updateStudentAction, type StudentFormState } from "../../actions";
import { StudentFields, type StudentBasicFields } from "../../student-fields";
import { StudentActionForm } from "../../student-workspace";

const initialState: StudentFormState = { error: null, saved: false };

export function StudentEditForm({ student, query = parseStudentListQuery({}) }: { student: StudentBasicFields & { id: string }; query?: StudentListQuery }) {
  const [state, formAction, pending] = useActionState(updateStudentAction, initialState);
  return (
    <StudentActionForm action={formAction} pending={pending} feedback={state} className="space-y-4">
      <input type="hidden" name="studentId" value={student.id} />
      <fieldset disabled={pending} className="min-w-0"><StudentFields student={student} /></fieldset>
      <p className="text-sm text-muted-foreground">Las alertas de salud y los consentimientos se administran desde la ficha.</p>
      {state.error ? <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{state.error}</p> : null}
      {state.saved ? <p role="status" className="rounded-lg bg-success/10 p-4 text-sm text-success">Alumno actualizado.</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Link href={studentTaskHref(`/dashboard/students/${student.id}`, query)} className={studentLinkClass}>{state.saved ? "Volver a la ficha" : "Cancelar"}</Link>
        <Button type="submit" variant="primary" isLoading={pending} className="min-h-11"><Save className="h-4 w-4" aria-hidden="true" />{pending ? "Guardando..." : "Guardar cambios"}</Button>
      </div>
    </StudentActionForm>
  );
}
