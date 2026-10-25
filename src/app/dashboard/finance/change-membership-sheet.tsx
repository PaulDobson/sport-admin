"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cycleEnd } from "@/domain/instructor-finance/dashboard";
import { formatShortDate, localIsoDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/format-money";
import { BottomSheet } from "@/presentation/components/bottom-sheet";
import { Button, StatusBadge, ToneBadge } from "@/presentation/components/primitives";
import {
  changeMembershipPlanAction,
  listAssignablePlansAction,
  type AssignablePlan,
  type ChangeMembershipPlanState,
} from "./actions";
import { PlanForm } from "./plan-form";
import { billingCycleLabels, billingCycleNouns } from "./plan-templates";

export interface CurrentMembership {
  id: string;
  planId: string;
  planName: string;
  agreedPrice: number;
  currency: string;
  expiresOn: string;
  status: string;
}

const initialState: ChangeMembershipPlanState = { status: "idle", error: null };

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground";

const optionClass =
  "grid min-h-11 w-full gap-1 rounded-xl border border-border bg-surface-raised/50 p-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/10";

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="metric-number text-right font-semibold text-foreground">
        {children}
      </dd>
    </div>
  );
}

function PlanPickerStep({
  currentPlanId,
  onSelect,
}: {
  currentPlanId: string;
  onSelect: (plan: AssignablePlan) => void;
}) {
  const [plans, setPlans] = useState<AssignablePlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listAssignablePlansAction()
      .then((loaded) => {
        if (!cancelled) {
          setPlans(loaded);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (failed) {
    return (
      <div role="alert" className="grid gap-2 text-sm">
        <p className="text-destructive">No pudimos cargar los planes.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (plans === null) {
    return <p className="text-sm text-muted-foreground">Cargando planes…</p>;
  }

  if (creating || plans.length === 0) {
    return (
      <div className="grid gap-3">
        {plans.length === 0 ? (
          <div className="grid gap-1 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-semibold text-foreground">
              No hay planes activos disponibles
            </p>
            <p className="text-xs text-muted-foreground">
              Crea un plan para continuar.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="quiet"
            onClick={() => setCreating(false)}
          >
            Volver a los planes
          </Button>
        )}
        <PlanForm
          compact
          onSaved={() => {
            setCreating(false);
            setPlans(null);
            setReloadKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  // Filter out the current plan so the user only sees plans they can switch to
  const otherPlans = plans.filter((p) => p.id !== currentPlanId);

  return (
    <div className="grid gap-3">
      {otherPlans.length === 0 ? (
        <div className="grid gap-2 rounded-xl border border-dashed border-border p-4 text-sm">
          <p className="font-semibold text-foreground">
            No hay otros planes disponibles
          </p>
          <p className="text-muted-foreground">
            El alumno ya está en el único plan activo. Crea uno nuevo para poder
            cambiar.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCreating(true)}
          >
            Crear nuevo plan
          </Button>
        </div>
      ) : (
        <>
          <ul aria-label="Planes disponibles" className="grid gap-2 sm:grid-cols-2">
            {otherPlans.map((plan) => (
              <li key={plan.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelect(plan)}
                  className={optionClass}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {plan.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {billingCycleLabels[plan.billingCycle]}
                    </span>
                  </span>
                  <span className="metric-number text-lg font-bold text-foreground">
                    {formatMoney(plan.price, plan.currency)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">
                      / {billingCycleNouns[plan.billingCycle]}
                    </span>
                  </span>
                  {plan.benefits.length > 0 ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {plan.benefits.join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Crear otro plan
          </button>
        </>
      )}
    </div>
  );
}

function ConfirmChangeStep({
  studentId,
  studentName,
  currentMembership,
  newPlan,
  assignmentToken,
  onChangePlan,
  onDone,
}: {
  studentId: string;
  studentName: string;
  currentMembership: CurrentMembership;
  newPlan: AssignablePlan;
  assignmentToken: string;
  onChangePlan: () => void;
  onDone: () => void;
}) {
  const startsOnId = useId();
  const [startsOn, setStartsOn] = useState(() => localIsoDate());

  const [state, formAction, pending] = useActionState(
    changeMembershipPlanAction,
    initialState,
  );

  const expiresOn = startsOn ? cycleEnd(startsOn, newPlan.billingCycle) : null;

  if (state.status === "changed" && state.result) {
    return (
      <div className="grid gap-4" role="status">
        <div className="grid gap-2 rounded-xl border border-success/30 bg-success/10 p-4">
          <ToneBadge tone="success">Plan actualizado</ToneBadge>
          <p className="text-base font-semibold text-foreground">
            {studentName} ahora tiene {newPlan.name}
          </p>
        </div>
        <dl className="grid gap-2 text-sm">
          <SummaryRow label="Nuevo plan">{newPlan.name}</SummaryRow>
          <SummaryRow label="Vence">
            {formatShortDate(state.result.expiresOn)}
          </SummaryRow>
          <SummaryRow label="Precio">
            {formatMoney(state.result.agreedPrice, state.result.currency)} /{" "}
            {billingCycleNouns[newPlan.billingCycle]}
          </SummaryRow>
        </dl>
        <Button type="button" variant="primary" onClick={onDone}>
          Listo
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="currentMembershipId" value={currentMembership.id} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="newPlanId" value={newPlan.id} />
      <input type="hidden" name="assignmentToken" value={assignmentToken} />

      {/* Current plan summary */}
      <div className="grid gap-2 rounded-xl border border-border bg-surface-raised/50 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plan actual
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-foreground">
            {currentMembership.planName}
          </span>
          <StatusBadge tone={currentMembership.status === "past_due" ? "warning" : "success"}>
            {currentMembership.status === "past_due" ? "En mora" : "Activa"}
          </StatusBadge>
        </div>
        <p className="text-muted-foreground">
          {formatMoney(currentMembership.agreedPrice, currentMembership.currency)} · vence{" "}
          {formatShortDate(currentMembership.expiresOn)}
        </p>
      </div>

      {/* New plan summary */}
      <dl className="grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Nuevo plan
        </p>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-foreground">{newPlan.name}</dt>
          <button
            type="button"
            onClick={onChangePlan}
            disabled={pending}
            className="text-xs font-semibold text-primary"
          >
            Cambiar
          </button>
        </div>
        <SummaryRow label="Precio">
          {formatMoney(newPlan.price, newPlan.currency)} /{" "}
          {billingCycleNouns[newPlan.billingCycle]}
        </SummaryRow>
      </dl>

      {/* Start date */}
      <div className="grid gap-1">
        <label htmlFor={startsOnId} className="text-sm text-muted-foreground">
          Inicio del nuevo plan
        </label>
        <input
          id={startsOnId}
          type="date"
          name="startsOn"
          required
          readOnly={pending}
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          className={fieldClass}
        />
        {expiresOn ? (
          <p className="text-xs text-muted-foreground">
            Vence: {formatShortDate(expiresOn)}
          </p>
        ) : null}
      </div>

      <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
        El plan actual se cancelará al confirmar el cambio. Registra cobros
        pendientes antes de continuar.
      </p>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" isLoading={pending}>
        Confirmar cambio de plan
      </Button>
    </form>
  );
}

function ChangeMembershipFlow({
  studentId,
  studentName,
  currentMembership,
  onDone,
}: {
  studentId: string;
  studentName: string;
  currentMembership: CurrentMembership;
  onDone: () => void;
}) {
  const [assignmentToken] = useState(() => crypto.randomUUID());
  const [newPlan, setNewPlan] = useState<AssignablePlan | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [newPlan]);

  return (
    <div className="grid gap-4">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-semibold text-foreground outline-none"
      >
        {newPlan ? "Revisa y confirma el cambio" : "Elige el nuevo plan"}
      </h3>

      {newPlan ? (
        <ConfirmChangeStep
          studentId={studentId}
          studentName={studentName}
          currentMembership={currentMembership}
          newPlan={newPlan}
          assignmentToken={assignmentToken}
          onChangePlan={() => setNewPlan(null)}
          onDone={onDone}
        />
      ) : (
        <PlanPickerStep
          currentPlanId={currentMembership.planId}
          onSelect={setNewPlan}
        />
      )}
    </div>
  );
}

/** Sheet to upgrade or downgrade a student's current membership plan. */
export function ChangeMembershipSheet({
  trigger,
  triggerClassName,
  studentId,
  studentName,
  currentMembership,
}: {
  trigger?: ReactNode;
  triggerClassName?: string;
  studentId: string;
  studentName: string;
  currentMembership: CurrentMembership;
}) {
  const [open, setOpen] = useState(false);

  return (
    <BottomSheet
      title="Cambiar plan"
      description={`Upgrade o downgrade del plan de ${studentName}. El plan actual se cancelará y se asignará el nuevo.`}
      trigger={trigger}
      triggerClassName={triggerClassName}
      open={open}
      onOpenChange={setOpen}
      variant="side"
    >
      <ChangeMembershipFlow
        studentId={studentId}
        studentName={studentName}
        currentMembership={currentMembership}
        onDone={() => setOpen(false)}
      />
    </BottomSheet>
  );
}
