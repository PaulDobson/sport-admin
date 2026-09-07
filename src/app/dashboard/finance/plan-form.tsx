"use client";

import { useActionState } from "react";
import type { MembershipPlan } from "@/domain/instructor-finance/membership";
import { Button } from "@/presentation/components/primitives";
import {
  createPlanAction,
  updatePlanAction,
  type PlanFormState,
} from "./actions";

const initialState: PlanFormState = { error: null, saved: false };

const fieldClass =
  "h-11 rounded-lg border border-input bg-background px-3 text-foreground";
const labelClass = "flex flex-col gap-1 text-sm text-muted-foreground";

export function PlanForm({ plan }: { plan?: MembershipPlan }) {
  const [state, formAction, pending] = useActionState(
    plan ? updatePlanAction : createPlanAction,
    initialState,
  );
  const membershipCount = plan?.membershipCount ?? 0;

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {plan ? <input type="hidden" name="planId" value={plan.id} /> : null}
      {plan && membershipCount > 0 ? (
        <p
          role="note"
          className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground sm:col-span-2"
        >
          {membershipCount === 1
            ? "1 membresía vigente conserva su precio y condiciones pactadas."
            : `${membershipCount} membresías vigentes conservan su precio y condiciones pactadas.`}{" "}
          El cambio aplica solo a nuevas altas.
        </p>
      ) : null}
      <label className={labelClass}>
        Nombre
        <input
          name="name"
          required
          defaultValue={plan?.name}
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Precio
        <input
          name="price"
          required
          type="number"
          min="0"
          step="1"
          defaultValue={plan?.price}
          className={fieldClass}
        />
      </label>
      <label className={labelClass}>
        Moneda
        <input
          name="currency"
          required
          defaultValue={plan?.currency ?? "CLP"}
          maxLength={3}
          className={`${fieldClass} uppercase`}
        />
      </label>
      <label className={labelClass}>
        Ciclo
        <select
          name="billingCycle"
          defaultValue={plan?.billingCycle ?? "monthly"}
          className={fieldClass}
        >
          <option value="monthly">Mensual</option>
          <option value="quarterly">Trimestral</option>
          <option value="semiannual">Semestral</option>
          <option value="annual">Anual</option>
        </select>
      </label>
      <label className={labelClass}>
        Gracia (días)
        <input
          name="expirationGraceDays"
          required
          type="number"
          min="0"
          max="365"
          defaultValue={plan?.expirationGraceDays ?? 0}
          className={fieldClass}
        />
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        Beneficios (uno por línea)
        <textarea
          name="benefits"
          rows={3}
          defaultValue={plan?.benefits.join("\n")}
          className="rounded-lg border border-input bg-background p-3 text-foreground"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-success sm:col-span-2">
          {plan ? "Plan actualizado." : "Plan creado."}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        className="sm:col-span-2"
      >
        {plan ? "Guardar cambios" : "Crear plan"}
      </Button>
    </form>
  );
}
