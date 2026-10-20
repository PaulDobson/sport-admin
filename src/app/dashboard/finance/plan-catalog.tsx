"use client";

import { useActionState } from "react";
import type { MembershipPlan } from "@/domain/instructor-finance/membership";
import { Button, EmptyState } from "@/presentation/components/primitives";
import { setPlanStatusAction, type PlanFormState } from "./actions";
import { AssignMembershipSheet } from "./assign-membership-sheet";
import { BottomSheet } from "./bottom-sheet";
import { PlanCard } from "./plan-card";
import { PlanForm } from "./plan-form";

const primaryTriggerClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90";

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
  monthlyRevenueByPlan,
}: {
  plans: MembershipPlan[];
  showArchived: boolean;
  canManage: boolean;
  /** Monthly equivalent of agreed prices of current memberships, by plan id. */
  monthlyRevenueByPlan?: Record<string, number>;
}) {
  return (
    <section aria-labelledby="plan-catalog-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="plan-catalog-heading" className="text-xl font-semibold">
            {showArchived ? "Planes archivados" : "Planes activos"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {showArchived
              ? "Reactiva un plan para volver a ofrecerlo."
              : "Define cómo cobras y asígnalo a tus alumnos en segundos."}
          </p>
        </div>
        {canManage && !showArchived ? (
          <BottomSheet
            title="Nuevo plan"
            description="Elige una plantilla o define precio, ciclo y beneficios."
            trigger={
              <>
                <span aria-hidden="true">+</span>
                Nuevo plan
              </>
            }
            triggerClassName={primaryTriggerClass}
            variant="side"
            size="wide"
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
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.id} className="min-w-0">
              <PlanCard
                plan={plan}
                monthlyRevenue={monthlyRevenueByPlan?.[plan.id]}
                actions={
                  canManage ? (
                    <>
                      {plan.status === "active" ? (
                        <AssignMembershipSheet
                          trigger="Asignar"
                          triggerLabel={`Asignar ${plan.name}`}
                          triggerClassName={primaryTriggerClass}
                          initialPlan={{
                            id: plan.id,
                            name: plan.name,
                            price: plan.price,
                            currency: plan.currency,
                            billingCycle: plan.billingCycle,
                            expirationGraceDays: plan.expirationGraceDays,
                            benefits: plan.benefits,
                          }}
                        />
                      ) : null}
                      <BottomSheet
                        title={`Editar ${plan.name}`}
                        trigger="Editar"
                        description="Los cambios aplican solo a nuevas membresías."
                        variant="side"
                        size="wide"
                      >
                        <div className="grid gap-4">
                          <PlanForm plan={plan} />
                          <PlanStatusButton
                            planId={plan.id}
                            archived={plan.status === "archived"}
                          />
                        </div>
                      </BottomSheet>
                    </>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
