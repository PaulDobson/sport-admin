"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/presentation/components/primitives";
import { parseStudentListQuery, studentListHref, studentTaskHref, studentLinkClass, type StudentListQuery } from "@/presentation/navigation/student-navigation";
import { createStudentAction, type StudentFormState } from "./actions";
import { OptionalStudentSection, StudentCheckbox, StudentFields } from "./student-fields";
import { StudentActionForm } from "./student-workspace";

const initialState: StudentFormState = { error: null, saved: false };

export function StudentForm({ query = parseStudentListQuery({}) }: { query?: StudentListQuery }) {
  const [allergies, setAllergies] = useState("");
  const [state, formAction, pending] = useActionState(createStudentAction, initialState);
  const created = Boolean(state.createdStudentId || state.saved);
  return (
    <StudentActionForm action={formAction} pending={pending} feedback={state} className="space-y-4">
      <fieldset disabled={pending || created} className="min-w-0 space-y-4">
        <StudentFields />
        <OptionalStudentSection title="Información de salud" description="Opcional · Alergias con consentimiento explícito">
          <label className="grid min-w-0 gap-2 text-sm sm:col-span-2">Alergias<textarea name="allergies" value={allergies} onChange={event => setAllergies(event.target.value)} rows={3} className="min-w-0 rounded-lg border border-input bg-background px-3 py-2" /></label>
          <p className="text-xs text-muted-foreground sm:col-span-2">Las alergias requieren una política de salud aprobada y consentimiento explícito del alumno o su tutor.</p>
          {allergies.trim() ? <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2"><StudentCheckbox name="representedConsentConfirmed" value="confirmed" required className="h-5 w-5 shrink-0" />Confirmo que el alumno o su tutor otorgó consentimiento explícito para registrar estos datos de salud.</label> : null}
        </OptionalStudentSection>
      </fieldset>
      {state.error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{state.error}</p> : null}
      {state.saved ? <p role="status" className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">Alumno creado. Ya puedes abrir su ficha.</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Link href={studentListHref(query)} className={studentLinkClass}>{created ? "Volver a alumnos" : "Cancelar"}</Link>
        {state.createdStudentId ? <Link href={studentTaskHref(`/dashboard/students/${state.createdStudentId}`, query)} className={`${studentLinkClass} bg-primary text-primary-foreground`}>Abrir ficha del alumno creado</Link> : null}
        {!created ? <Button type="submit" variant="primary" isLoading={pending} className="min-h-11">{pending ? "Guardando..." : "Crear alumno"}</Button> : null}
      </div>
    </StudentActionForm>
  );
}
