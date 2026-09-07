"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { archiveStudentAction, type StudentFormState } from "./actions";

const initialState: StudentFormState = { error: null, saved: false };

export function StudentArchiveButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [state, formAction, pending] = useActionState(
    archiveStudentAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Eliminar a ${studentName} de alumnos activos? Se conservara su historial.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex"
    >
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Eliminar ${studentName}`}
        title={state.error ?? "Eliminar"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-destructive/35 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-45"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
