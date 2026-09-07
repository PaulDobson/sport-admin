"use client";

import { useActionState } from "react";
import { Button } from "@/presentation/components/primitives";
import type { TenantTransitionStatus } from "@/domain/saas-administration/tenant-backoffice";
import {
  transitionTenantStatusAction,
  type TenantStatusFormState,
} from "./actions";

const initialState: TenantStatusFormState = { error: null, saved: false };

const statusLabels: Record<TenantTransitionStatus, string> = {
  trial: "Iniciar trial",
  active: "Activar",
  suspended: "Suspender",
  cancelled: "Cancelar",
};

export function TenantStatusForm({
  tenantId,
  availableStatuses,
}: {
  tenantId: string;
  availableStatuses: TenantTransitionStatus[];
}) {
  const [state, action, pending] = useActionState(
    transitionTenantStatusAction,
    initialState,
  );

  if (availableStatuses.length === 0) {
    return <p className="text-sm text-muted-foreground">Estado final</p>;
  }

  return (
    <form
      action={action}
      className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[10rem_1fr_auto]"
    >
      <input type="hidden" name="tenantId" value={tenantId} />
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Nuevo estado
        <select
          name="status"
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        >
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Motivo
        <input
          required
          minLength={3}
          maxLength={500}
          name="reason"
          placeholder="Motivo de la decisión"
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        />
      </label>
      <Button
        type="submit"
        variant="primary"
        isLoading={pending}
        className="h-10 self-end rounded-md"
      >
        {pending ? "Guardando..." : "Aplicar"}
      </Button>
      {state.error ? (
        <p
          className="text-sm font-medium text-destructive sm:col-span-3"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p
          className="text-sm font-medium text-success sm:col-span-3"
          role="status"
        >
          Estado actualizado.
        </p>
      ) : null}
    </form>
  );
}
