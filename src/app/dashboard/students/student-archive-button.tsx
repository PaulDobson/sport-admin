"use client";

import { useActionState, useCallback, useContext, useId, useRef } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { archiveStudentAction, type StudentFormState } from "./actions";
import { StudentFeedbackContext } from "./student-workspace";

const initialState: StudentFormState = { error: null, saved: false };

export function StudentArchiveButton({
  studentId,
  studentName,
  compact = false,
}: {
  studentId: string;
  studentName: string;
  compact?: boolean;
}) {
  const notify = useContext(StudentFeedbackContext);

  // Stable action wrapper — useCallback keeps a single function identity
  // across renders so React does not need to re-register the action.
  const action = useCallback(
    async (previous: StudentFormState, data: FormData) => {
      const result = await archiveStudentAction(previous, data);
      if (result.saved)
        notify?.(`${studentName} se archivó. Su historial se conserva.`);
      return result;
    },
    // studentName and notify are stable for the lifetime of the button.
    [notify, studentName],
  );

  const [state, formAction, pending] = useActionState(action, initialState);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`Archivar ${studentName}`}
        title={`Archivar ${studentName}`}
        onClick={() => dialog.current?.showModal()}
        className={
          compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-warning/10 hover:text-warning focus-visible:outline-2 focus-visible:outline-primary"
            : "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary"
        }
      >
        <Archive className="h-4 w-4" aria-hidden="true" />
        <span className={compact ? "sr-only" : "md:sr-only xl:not-sr-only"}>
          Archivar
        </span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => trigger.current?.focus()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first || !last) {
            event.preventDefault();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl backdrop:bg-black/65"
      >
        <h2 id={titleId} className="text-xl font-semibold wrap-anywhere">
          Archivar a {studentName}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm text-muted-foreground">
          Dejará de aparecer entre los alumnos activos. Se conservarán su
          historial, membresías y asistencia. Esto no elimina sus datos
          personales.
        </p>
        {state.error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.saved ? (
          <p role="status" className="mt-4 text-sm text-success">
            Alumno archivado.
          </p>
        ) : null}
        <form
          action={formAction}
          className="mt-5 flex flex-wrap justify-end gap-3"
        >
          <input type="hidden" name="studentId" value={studentId} />
          <Button
            autoFocus
            type="button"
            disabled={pending}
            onClick={() => dialog.current?.close()}
            className="min-h-11"
          >
            {state.saved ? "Cerrar" : "Cancelar"}
          </Button>
          {!state.saved ? (
            <Button
              type="submit"
              variant="danger"
              isLoading={pending}
              className="min-h-11"
            >
              {pending ? "Archivando..." : "Confirmar archivado"}
            </Button>
          ) : null}
        </form>
      </dialog>
    </>
  );
}
