"use client";

import { useActionState } from "react";
import type { MembershipPlan } from "@/domain/instructor-finance/membership";
import {
  activateMembershipAction,
  createRestrictionAction,
  type StudentDetailFormState,
} from "./actions";

const initialState: StudentDetailFormState = { error: null, saved: false };

function Feedback({ state }: { state: StudentDetailFormState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  if (state.saved)
    return (
      <p role="status" className="text-sm text-success">
        Guardado.
      </p>
    );
  return null;
}

export function MembershipForm({
  studentId,
  plans,
  startsOn,
}: {
  studentId: string;
  plans: MembershipPlan[];
  startsOn: string;
}) {
  const [state, formAction, pending] = useActionState(
    activateMembershipAction,
    initialState,
  );
  return (
    <form action={formAction} className="surface-panel grid gap-4 p-4">
      <input type="hidden" name="studentId" value={studentId} />
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Plan
        <select
          name="planId"
          required
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        >
          <option value="">Selecciona un plan</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {plan.price} {plan.currency}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Inicio
        <input
          type="date"
          name="startsOn"
          required
          defaultValue={startsOn}
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending || plans.length === 0}
        className="h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Asignando..." : "Asignar membresía"}
      </button>
    </form>
  );
}

export function RestrictionForm({
  studentId,
  startsOn,
}: {
  studentId: string;
  startsOn: string;
}) {
  const [state, formAction, pending] = useActionState(
    createRestrictionAction,
    initialState,
  );
  return (
    <form action={formAction} className="surface-panel grid gap-4 p-4">
      <input type="hidden" name="studentId" value={studentId} />
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Nivel
        <select
          name="severity"
          defaultValue="yellow"
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        >
          <option value="green">Verde</option>
          <option value="yellow">Amarillo</option>
          <option value="red">Rojo</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Motivo
        <input
          name="description"
          required
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Acción operativa
        <input
          name="operationalAction"
          required
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Desde
          <input
            type="date"
            name="startsOn"
            required
            defaultValue={startsOn}
            className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Hasta
          <input
            type="date"
            name="endsOn"
            className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-foreground"
          />
        </label>
      </div>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar alerta"}
      </button>
    </form>
  );
}
