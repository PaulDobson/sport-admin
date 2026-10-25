"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowLeft,
  UserCheck,
  TriangleAlert,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import {
  parseStudentListQuery,
  studentListHref,
  studentTaskHref,
  studentLinkClass,
  type StudentListQuery,
} from "@/presentation/navigation/student-navigation";
import type { AssignablePlan } from "@/app/dashboard/finance/actions";
import { createStudentAction, type StudentFormState } from "./actions";
import {
  MembershipPlanSection,
  HealthSection,
  StudentFields,
} from "./student-fields";
import { StudentActionForm } from "./student-workspace";

const initialState: StudentFormState = { error: null, saved: false };

// Shared class for action-area link buttons (mirrors schedule page actionClass)
const linkButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function StudentForm({
  query = parseStudentListQuery({}),
  plans = [],
}: {
  query?: StudentListQuery;
  plans?: AssignablePlan[];
}) {
  const [allergies, setAllergies] = useState("");
  const [state, formAction, pending] = useActionState(
    createStudentAction,
    initialState,
  );
  const created = Boolean(state.createdStudentId || state.saved);

  return (
    <StudentActionForm
      action={formAction}
      pending={pending}
      feedback={state}
      className="space-y-4"
    >
      <fieldset disabled={pending || created} className="min-w-0 space-y-3">
        <StudentFields />
        <MembershipPlanSection plans={plans} />
        <HealthSection allergies={allergies} onAllergiesChange={setAllergies} />
      </fieldset>

      {/* ── Inline feedback ── */}
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>{state.error}</p>
        </div>
      ) : null}

      {state.saved ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success"
        >
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <p>Alumno creado correctamente. Ya puedes abrir su ficha.</p>
        </div>
      ) : null}

      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        {/* Left: back/cancel */}
        <Link
          href={studentListHref(query)}
          className={`${linkButtonClass} border-border bg-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {created ? "Volver a alumnos" : "Cancelar"}
        </Link>

        {/* Right: primary actions */}
        <div className="flex flex-wrap items-center gap-2">
          {state.createdStudentId ? (
            <Link
              href={studentTaskHref(
                `/dashboard/students/${state.createdStudentId}`,
                query,
              )}
              className={`${linkButtonClass} border-primary bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              <UserCheck aria-hidden="true" className="h-4 w-4" />
              Abrir ficha
            </Link>
          ) : null}

          {!created ? (
            <Button
              type="submit"
              variant="primary"
              isLoading={pending}
              className="min-h-11 gap-2 px-5"
            >
              {pending ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  Guardando…
                </>
              ) : (
                <>
                  <UserCheck aria-hidden="true" className="h-4 w-4" />
                  Crear alumno
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </StudentActionForm>
  );
}
