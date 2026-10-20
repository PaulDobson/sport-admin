"use client";

import { useActionState, useCallback, useState } from "react";
import { Check, Copy, Link2, Mail } from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { StudentActionForm } from "../student-workspace";
import {
  createStudentPortalInviteAction,
  type StudentPortalInviteState,
} from "./portal-invitation-actions";

const initialState: StudentPortalInviteState = {
  error: null,
  inviteUrl: null,
  email: null,
  expiresAt: null,
};

export function StudentPortalInviteButton({
  studentId,
}: {
  studentId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createStudentPortalInviteAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Stable closure — only recreated when the invite URL actually changes.
  const copyInvite = useCallback(async () => {
    if (!state.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
      setCopyError(null);
    } catch {
      setCopyError(
        "No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.",
      );
    }
  }, [state.inviteUrl]);

  return (
    <section className="mb-6 rounded-xl bg-card/65 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Link2 aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Acceso para alumno o apoderado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Genera un enlace para que pueda crear su cuenta y reservar sesiones
            de esta ficha.
          </p>
        </div>
      </div>
      {state.inviteUrl ? (
        <div className="mt-4 space-y-3">
          <p className="flex items-start gap-2 break-all text-sm text-muted-foreground">
            <Mail aria-hidden="true" className="h-4 w-4" />
            Enlace para {state.email}; vence el {state.expiresAt}.
          </p>
          <div className="flex gap-2">
            <input
              aria-label="Enlace de invitación"
              readOnly
              value={state.inviteUrl}
              className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={copyInvite}
              aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
              title={copied ? "Enlace copiado" : "Copiar enlace"}
              className="h-11 w-11 shrink-0 px-0"
            >
              {copied ? (
                <Check aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Copy aria-hidden="true" className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Comparte este enlace directamente con la persona invitada. Sólo se
            puede usar una vez.
          </p>
          {copyError ? (
            <p role="alert" className="text-sm text-destructive">
              {copyError}
            </p>
          ) : null}
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <StudentActionForm
            action={formAction}
            pending={pending}
            feedback={state}
          >
            <input type="hidden" name="studentId" value={studentId} />
            <Button
              type="submit"
              isLoading={pending}
              className="min-h-11 text-xs font-semibold text-primary"
            >
              Revocar y generar otro enlace
            </Button>
          </StudentActionForm>
        </div>
      ) : (
        <StudentActionForm
          action={formAction}
          pending={pending}
          feedback={state}
          className="mt-4"
        >
          <input type="hidden" name="studentId" value={studentId} />
          {state.error ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="secondary"
            isLoading={pending}
            className="min-h-11"
          >
            {pending ? "Generando enlace…" : "Generar invitación"}
          </Button>
        </StudentActionForm>
      )}
    </section>
  );
}
