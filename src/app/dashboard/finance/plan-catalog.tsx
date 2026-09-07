"use client";

import { useActionState } from "react";
import type { MembershipPlan } from "@/domain/instructor-finance/membership";
import { formatMoney } from "@/lib/format-money";
import {
  Button,
  EmptyState,
  Surface,
} from "@/presentation/components/primitives";
import { setPlanStatusAction, type PlanFormState } from "./actions";
import { BottomSheet } from "./bottom-sheet";
import { PlanForm } from "./plan-form";

const cycleLabels: Record<string, string> = {
  monthly: "mes",
  quarterly: "trimestre",
  semiannual: "semestre",
  annual: "año",
};

const initialState: PlanFormState = { error: null, saved: false };

function PlanStatusButton({
  planId,
  archived,
}: {
  planId: string;
  archived: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setPlanStatusAction,
    initialState,
  );
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="planId" value={planId} />
      <input
        type="hidden"
        name="status"
        value={archived ? "active" : "archived"}
      />
      <Button
        type="submit"
        variant={archived ? "secondary" : "danger"}
        isLoading={pending}
      >
        {archived ? "Reactivar plan" : "Archivar plan"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function PlanCatalog({
  plans,
  showArchived,
  canManage,
}: {
  plans: MembershipPlan[];
  showArchived: boolean;
  canManage: boolean;
}) {
  return (
    <section aria-labelledby="plan-catalog-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="plan-catalog-heading" className="text-xl font-semibold">
          {showArchived ? "Planes archivados" : "Planes activos"}
        </h2>
        {canManage && !showArchived ? (
          <BottomSheet
            title="Nuevo plan"
            description="Define precio, ciclo y beneficios del plan."
            trigger="Nuevo plan"
            triggerClassName="inline-flex min-h-11 items-center justify-center rounded-lg border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlanForm />
          </BottomSheet>
        ) : null}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          title={showArchived ? "Sin planes archivados" : "Sin planes"}
          description={
            showArchived
              ? "Los planes que archives quedarán disponibles aquí."
              : "Crea tu primer plan para poder asignar membresías."
          }
        />
      ) : (
        <ul className="grid gap-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Surface className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{plan.name}</p>
                    <p className="metric-number mt-1 text-sm text-muted-foreground">
                      {formatMoney(plan.price, plan.currency)} /{" "}
                      {cycleLabels[plan.billingCycle] ?? plan.billingCycle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.membershipCount ?? 0} alumnos · gracia{" "}
                      {plan.expirationGraceDays} días
                    </p>
                  </div>
                  {canManage ? (
                    <BottomSheet
                      title={`Editar ${plan.name}`}
                      trigger="Editar"
                      description="Los cambios aplican solo a nuevas membresías."
                    >
                      <div className="grid gap-4">
                        <PlanForm plan={plan} />
                        <PlanStatusButton
                          planId={plan.id}
                          archived={plan.status === "archived"}
                        />
                      </div>
                    </BottomSheet>
                  ) : null}
                </div>
                {plan.benefits.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {plan.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground"
                      >
                        {benefit}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
