"use client";

import { useActionState } from "react";
import { Button } from "@/presentation/components/primitives";
import { UsageMeter } from "@/presentation/components/backoffice-widgets";
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
    <form action={action} className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Herramienta de compatibilidad para límites antiguos. Para asignar o
        cambiar un contrato, usa Gestionar suscripción y revisa primero su
        efecto financiero. Los contratos comerciales rechazan esta programación.
      </p>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input
        type="hidden"
        name="subscriptionId"
        value={entitlements.subscriptionId}
      />
      <div className="grid grid-cols-2 gap-2">
        <UsageMeter
          label="Alumnos"
          used={entitlements.activeStudents}
          limit={entitlements.maxStudents}
        />
        <UsageMeter
          label="Usuarios"
          used={entitlements.activeUsers}
          limit={entitlements.maxUsers}
        />
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
        Plan
        <select
          required
          name="planId"
          defaultValue={entitlements.planId}
          className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} · {plan.maxStudents} alumnos · {plan.maxUsers}{" "}
              usuarios
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
        Vigente desde
        <input
          required
          type="date"
          name="effectiveFrom"
          min={minimumDate}
          defaultValue={minimumDate}
          className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
        Motivo
        <input
          required
          minLength={3}
          maxLength={500}
          name="reason"
          placeholder="Motivo del cambio"
          className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
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
        className="h-11 w-full"
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
