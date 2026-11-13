"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { Button, Surface } from "@/presentation/components/primitives";
import { endTrialAction, type EndTrialFormState } from "./end-trial-action";

const initial: EndTrialFormState = { error: null, done: false };

export function EndTrialForm({
  tenantId,
  operationId,
  trialEndDate,
}: {
  tenantId: string;
  operationId: string;
  trialEndDate: string;
}) {
  const [state, action, pending] = useActionState(endTrialAction, initial);
  const [reason, setReason] = useState("");
  const [identity, setIdentity] = useState(operationId);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [state]);

  if (state.done) {
    return (
      <Surface>
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-success" />
          Período de prueba terminado
        </p>
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          El período de prueba fue adelantado a hoy. Usa el formulario de
          renovación que aparece a continuación para activar la suscripción
          inmediatamente, o espera al próximo ciclo del scheduler.
        </p>
      </Surface>
    );
  }

  return (
    <Surface>
      <h2 className="flex items-center gap-2 font-bold">
        <FlaskConical aria-hidden className="h-4 w-4 shrink-0" />
        Terminar período de prueba
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        El trial vence el <strong>{trialEndDate}</strong>. Esta acción adelanta
        el límite a hoy para que el scheduler active la suscripción en el
        próximo ciclo. No genera un cobro por sí sola.
      </p>
      <form
        ref={ref}
        aria-label="Terminar período de prueba"
        aria-busy={pending}
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          startTransition(() => action(new FormData(event.currentTarget)));
        }}
      >
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="operationId" value={identity} />
        <div className="grid gap-1.5">
          <label htmlFor="end-trial-reason" className="text-xs font-semibold">
            Motivo
          </label>
          <input
            id="end-trial-reason"
            name="reason"
            required
            minLength={3}
            maxLength={500}
            placeholder="Ej: Cliente solicitó activación inmediata"
            value={reason}
            disabled={pending}
            onChange={(e) => {
              setReason(e.target.value);
              setIdentity(crypto.randomUUID());
            }}
            className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-45"
          />
        </div>
        {state.error ? (
          <p
            role="alert"
            tabIndex={-1}
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          isLoading={pending}
          className="min-h-11"
        >
          <FlaskConical aria-hidden className="h-4 w-4 shrink-0" />
          Terminar prueba ahora
        </Button>
      </form>
    </Surface>
  );
}
