"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Pencil, Trash2 } from "lucide-react";
import {
  maintainSessionAction,
  type SessionActionState,
} from "./session-actions";
import { operationalTimezone } from "./session-presentation";
import { BottomSheet } from "@/presentation/components/bottom-sheet";

const initialState: SessionActionState = { error: null, message: null };
const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function localInputValue(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: operationalTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function SessionMaintenance({
  session,
  compact = false,
}: {
  compact?: boolean;
  session: {
    id: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number;
    confirmedCount: number;
    status?: "scheduled" | "cancelled" | "completed";
  };
}) {
  const [state, formAction, pending] = useActionState(
    maintainSessionAction,
    initialState,
  );

  const form = (
      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="sessionId" value={session.id} />
        <label className="text-xs font-semibold text-muted-foreground">
          Inicio ({operationalTimezone})
          <input
            className={fieldClass}
            type="datetime-local"
            name="startsAtLocal"
            defaultValue={localInputValue(session.startsAt)}
            required
            disabled={pending}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Término ({operationalTimezone})
          <input
            className={fieldClass}
            type="datetime-local"
            name="endsAtLocal"
            defaultValue={localInputValue(session.endsAt)}
            required
            disabled={pending}
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Cupos
          <input
            className={fieldClass}
            type="number"
            name="capacity"
            min={String(Math.max(1, session.confirmedCount))}
            max="500"
            defaultValue={session.capacity}
            required
            disabled={pending}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
          <button
            type="submit"
            name="operation"
            value="update"
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Check aria-hidden="true" className="h-4 w-4" />
            Guardar cambios
          </button>
          {session.status === "cancelled" ? (
            <button
              type="submit"
              name="operation"
              value="reactivate"
              formNoValidate
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/40 px-4 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              Reactivar sesión
            </button>
          ) : session.status !== "completed" ? (
            <button
              type="submit"
              name="operation"
              value="cancel"
              formNoValidate
              disabled={pending}
              onClick={(event) => {
                if (
                  !window.confirm(
                    `¿Cancelar la sesión "${session.name}"? Se conservará el registro y las reservas.`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Cancelar sesión
            </button>
          ) : null}
          {pending ? <span className="text-sm text-muted-foreground">Guardando…</span> : null}
        </div>
        {state.error ? (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive sm:col-span-3">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p role="status" className="flex items-start gap-2 text-sm text-success sm:col-span-3">
            <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {state.message}
          </p>
        ) : null}
      </form>
  );

  if (compact) {
    return (
      <BottomSheet
        title={`Gestionar ${session.name}`}
        description="Actualiza el horario y los cupos, o cambia el estado de la sesión."
        trigger={<Pencil aria-hidden="true" className="h-4 w-4" />}
        triggerLabel={`Editar o cancelar sesión de ${session.name}`}
        triggerClassName="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {form}
      </BottomSheet>
    );
  }

  return (
    <details className="mt-4 border-t border-border/60 pt-3">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
        <Pencil aria-hidden="true" className="h-4 w-4" />
        Editar o cancelar sesión
      </summary>
      {form}
    </details>
  );
}
