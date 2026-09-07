"use client";

import { useActionState } from "react";
import { Button } from "@/presentation/components/primitives";
import type {
  SaasPlanOption,
  TenantEntitlementUsage,
} from "@/domain/saas-administration/tenant-backoffice";
import {
  scheduleTenantPlanLimitsAction,
  type TenantStatusFormState,
} from "./actions";

const initialState: TenantStatusFormState = { error: null, saved: false };

export function PlanLimitsForm({
  tenantId,
  entitlements,
  plans,
  minimumDate,
}: {
  tenantId: string;
  entitlements: TenantEntitlementUsage;
  plans: SaasPlanOption[];
  minimumDate: string;
}) {
  const [state, action, pending] = useActionState(
    scheduleTenantPlanLimitsAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input
        type="hidden"
        name="subscriptionId"
        value={entitlements.subscriptionId}
      />
      <dl className="grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Alumnos</dt>
          <dd className="metric-number font-semibold">
            {entitlements.activeStudents}/{entitlements.maxStudents}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Usuarios</dt>
          <dd className="metric-number font-semibold">
            {entitlements.activeUsers}/{entitlements.maxUsers}
          </dd>
        </div>
      </dl>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Plan
        <select
          required
          name="planId"
          defaultValue={entitlements.planId}
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {plan.maxStudents} alumnos · {plan.maxUsers}{" "}
              usuarios
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Vigente desde
        <input
          required
          type="date"
          name="effectiveFrom"
          min={minimumDate}
          defaultValue={minimumDate}
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Motivo
        <input
          required
          minLength={3}
          maxLength={500}
          name="reason"
          placeholder="Motivo del cambio"
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Si el nuevo cupo es menor al uso actual, se conservarán los datos y se
        bloquearán nuevas altas.
      </p>
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        disabled={plans.length === 0}
        className="h-10 w-full rounded-md"
      >
        {pending ? "Programando..." : "Programar cambio"}
      </Button>
      {state.error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="text-sm font-medium text-success" role="status">
          Cambio programado.
        </p>
      ) : null}
    </form>
  );
}
