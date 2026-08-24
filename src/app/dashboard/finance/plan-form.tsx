"use client";

import { useActionState } from "react";
import { createPlanAction, type PlanFormState } from "./actions";

const initialState: PlanFormState = { error: null, saved: false };

export function PlanForm() {
  const [state, formAction, pending] = useActionState(
    createPlanAction,
    initialState,
  );
  return (
    <form
      action={formAction}
      className="surface-panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Nombre
        <input
          name="name"
          required
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Precio
        <input
          name="price"
          required
          type="number"
          min="0"
          step="0.01"
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Moneda
        <input
          name="currency"
          required
          defaultValue="USD"
          maxLength={3}
          className="h-10 rounded-md border border-input bg-background px-3 uppercase text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Ciclo
        <select
          name="billingCycle"
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        >
          <option value="monthly">Mensual</option>
          <option value="quarterly">Trimestral</option>
          <option value="semiannual">Semestral</option>
          <option value="annual">Anual</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Gracia (días)
        <input
          name="expirationGraceDays"
          required
          type="number"
          min="0"
          max="365"
          defaultValue="0"
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      {state.error ? (
        <p
          role="alert"
          className="text-sm text-destructive sm:col-span-2 lg:col-span-5"
        >
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p
          role="status"
          className="text-sm text-success sm:col-span-2 lg:col-span-5"
        >
          Plan creado.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60 sm:col-start-2 lg:col-span-2 lg:col-start-4"
      >
        {pending ? "Guardando..." : "Crear plan"}
      </button>
    </form>
  );
}
