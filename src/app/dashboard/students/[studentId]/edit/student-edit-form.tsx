"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateStudentAction, type StudentFormState } from "../../actions";

const initialState: StudentFormState = { error: null, saved: false };

export function StudentEditForm({
  student,
}: {
  student: {
    id: string;
    fullName: string;
    birthDate: string | null;
    primaryContact: {
      type: "email" | "phone" | "emergency";
      value: string;
    } | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateStudentAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/10 sm:grid-cols-2"
    >
      <input type="hidden" name="studentId" value={student.id} />
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Nombre completo
        <input
          name="fullName"
          required
          defaultValue={student.fullName}
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Fecha de nacimiento
        <input
          name="birthDate"
          type="date"
          defaultValue={student.birthDate ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Tipo de contacto principal
        <select
          name="contactType"
          defaultValue={student.primaryContact?.type ?? "phone"}
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        >
          <option value="phone">Teléfono</option>
          <option value="email">Email</option>
          <option value="emergency">Emergencia</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Contacto principal
        <input
          name="contactValue"
          defaultValue={student.primaryContact?.value ?? ""}
          placeholder="Opcional"
          className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-success sm:col-span-2">
          Alumno actualizado.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-start-2"
      >
        <Save className="h-4 w-4" aria-hidden="true" />
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
