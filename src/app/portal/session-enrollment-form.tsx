"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Clock3 } from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import type { StudentPortalSession } from "@/application/student-portal/ports/student-portal-port";
import { changePortalEnrollmentAction } from "./actions";

const initialState = { error: null, success: false };

export function SessionEnrollmentForm({
  session,
}: {
  session: StudentPortalSession;
}) {
  const [state, formAction, pending] = useActionState(
    changePortalEnrollmentAction,
    initialState,
  );
  const enrolled = session.enrollmentStatus === "confirmed";
  const waitlisted = session.enrollmentStatus === "waitlisted";
  const fullWithoutWaitlist =
    !session.enrollmentStatus &&
    session.confirmedCount >= session.capacity &&
    !session.waitlistEnabled;

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="tenantId" value={session.tenantId} />
      <input type="hidden" name="studentId" value={session.studentId} />
      <input type="hidden" name="sessionId" value={session.id} />
      {state.error ? (
        <p
          role="alert"
          className="flex max-w-52 items-center gap-1 text-right text-xs text-destructive"
        >
          <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {state.error}
        </p>
      ) : null}
      {enrolled || waitlisted ? (
        <>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold ${enrolled ? "text-success" : "text-warning"}`}
          >
            {enrolled ? (
              <Check aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Clock3 aria-hidden="true" className="h-4 w-4" />
            )}
            {enrolled ? "Reservada" : "En lista de espera"}
          </span>
          <Button
            type="submit"
            name="operation"
            value="cancel"
            variant="quiet"
            isLoading={pending}
            className="min-h-9 px-2 text-xs text-muted-foreground"
          >
            Cancelar
          </Button>
        </>
      ) : fullWithoutWaitlist ? (
        <span className="text-xs font-semibold text-muted-foreground">
          Sesión completa
        </span>
      ) : (
        <Button
          type="submit"
          name="operation"
          value="enroll"
          variant="primary"
          isLoading={pending}
          className="min-h-10 px-3 text-xs"
        >
          {pending ? "Reservando…" : "Reservar cupo"}
        </Button>
      )}
    </form>
  );
}
