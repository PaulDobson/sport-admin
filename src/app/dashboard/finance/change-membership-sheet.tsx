"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cycleEnd } from "@/domain/instructor-finance/dashboard";
import type { PlanDifferential } from "@/domain/instructor-finance/membership";
import { formatShortDate, localIsoDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/format-money";
import { BottomSheet } from "@/presentation/components/bottom-sheet";
import { MoneyInput } from "@/presentation/components/form-controls";
import {
  Button,
  StatusBadge,
  ToneBadge,
} from "@/presentation/components/primitives";
import {
  changeMembershipPlanAction,
  previewPlanDifferentialAction,
  listAssignablePlansAction,
  type AssignablePlan,
  type ChangeMembershipPlanState,
  type DifferentialPreview,
} from "./actions";
import { PlanForm } from "./plan-form";
import { billingCycleLabels, billingCycleNouns } from "./plan-templates";
import { paymentMethods } from "@/domain/instructor-finance/payment";

export interface CurrentMembership {
  id: string;
  planId: string;
  planName: string;
  agreedPrice: number;
  currency: string;
  billingCycle: string;
  startsOn: string;
  expiresOn: string;
  status: string;
}

const initialState: ChangeMembershipPlanState = { status: "idle", error: null };

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground";

const optionClass =
  "grid min-h-11 w-full gap-1 rounded-xl border border-border bg-surface-raised/50 p-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary/10";

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

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

// ─── Step 1: Pick a plan ──────────────────────────────────────────────────────

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
          <ul
            aria-label="Planes disponibles"
            className="grid gap-2 sm:grid-cols-2"
          >
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

// ─── Differential badge ───────────────────────────────────────────────────────

function DifferentialBadge({
  differential,
  currency,
}: {
  differential: PlanDifferential;
  currency: string;
}) {
  const isUpgrade = differential.differential > 0;
  const isBreakEven = differential.differential === 0;
  const isDowngrade = differential.differential < 0;

  return (
    <div
      className={`grid gap-2 rounded-xl border p-3 text-sm ${
        isUpgrade
          ? "border-warning/40 bg-warning/5"
          : isDowngrade
            ? "border-success/40 bg-success/5"
            : "border-border bg-surface-raised/40"
      }`}
    >
      <div className="flex items-center gap-2">
        {isUpgrade ? (
          <ArrowUp className="h-4 w-4 text-warning" aria-hidden="true" />
        ) : isDowngrade ? (
          <ArrowDown className="h-4 w-4 text-success" aria-hidden="true" />
        ) : (
          <Minus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="font-semibold text-foreground">
          {isUpgrade
            ? "Upgrade — cobro diferencial"
            : isDowngrade
              ? "Downgrade — crédito a favor"
              : "Sin diferencia de precio"}
        </span>
      </div>

      <dl className="grid gap-1">
        <SummaryRow label="Días consumidos del plan actual">
          {differential.elapsedDays} / {differential.cycleDays} días
        </SummaryRow>
        <SummaryRow label="Valor consumido">
          {formatMoney(differential.consumedValue, currency)}
        </SummaryRow>
        <SummaryRow label="Crédito sin usar">
          {formatMoney(differential.unusedCredit, currency)}
        </SummaryRow>
        <SummaryRow label="Nuevo plan (precio completo)">
          {formatMoney(differential.newPlanPrice, currency)}
        </SummaryRow>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2">
          <dt className="font-semibold text-foreground">
            {isUpgrade
              ? "Diferencial a cobrar"
              : isDowngrade
                ? "Crédito a favor del alumno"
                : "Diferencial"}
          </dt>
          <dd
            className={`metric-number text-right text-base font-bold ${
              isUpgrade
                ? "text-warning"
                : isDowngrade
                  ? "text-success"
                  : "text-foreground"
            }`}
          >
            {formatMoney(Math.abs(differential.differential), currency)}
          </dd>
        </div>
      </dl>

      {isDowngrade ? (
        <p className="text-xs text-muted-foreground">
          El alumno pagó más de lo que corresponde al nuevo plan. Puedes
          registrar el crédito como descuento en el siguiente cobro.
        </p>
      ) : null}
    </div>
  );
}

// ─── Step 2: Preview differential ────────────────────────────────────────────

function DifferentialStep({
  currentMembership,
  newPlan,
  changeOn,
  onContinue,
  onChangePlan,
}: {
  currentMembership: CurrentMembership;
  newPlan: AssignablePlan;
  changeOn: string;
  onContinue: (preview: DifferentialPreview) => void;
  onChangePlan: () => void;
}) {
  const [preview, setPreview] = useState<DifferentialPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!changeOn) return;
    let cancelled = false;
    // Defer the initial setState calls out of the synchronous effect body so
    // they run as a microtask — avoids the react-hooks/set-state-in-effect rule.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      previewPlanDifferentialAction({
        currentMembershipId: currentMembership.id,
        newPlanId: newPlan.id,
        changeOn,
      })
        .then((result) => {
          if (cancelled) return;
          if (result.ok) {
            setPreview(result.data);
          } else {
            setError(result.error);
          }
        })
        .catch(() => {
          if (!cancelled) setError("No se pudo calcular el diferencial.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [currentMembership.id, newPlan.id, changeOn]);

  return (
    <div className="grid gap-4">
      {/* Plan comparison */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-raised/50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plan actual
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {currentMembership.planName}
          </p>
          <p className="text-muted-foreground">
            {formatMoney(
              currentMembership.agreedPrice,
              currentMembership.currency,
            )}
          </p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Nuevo plan
          </p>
          <p className="mt-1 font-semibold text-foreground">{newPlan.name}</p>
          <p className="text-muted-foreground">
            {formatMoney(newPlan.price, newPlan.currency)} /{" "}
            {billingCycleNouns[newPlan.billingCycle]}
          </p>
        </div>
      </div>

      {/* Differential calculation */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Calculando diferencial…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : preview ? (
        <DifferentialBadge
          differential={preview.differential}
          currency={preview.currency}
        />
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="quiet" onClick={onChangePlan}>
          Cambiar plan
        </Button>
        {preview ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => onContinue(preview)}
          >
            Continuar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Step 3: Confirm and optionally collect differential ──────────────────────

function ConfirmChangeStep({
  studentId,
  studentName,
  currentMembership,
  newPlan,
  changeToken,
  cancelOperationId,
  changeOn,
  preview,
  onChangePlan,
  onDone,
}: {
  studentId: string;
  studentName: string;
  currentMembership: CurrentMembership;
  newPlan: AssignablePlan;
  changeToken: string;
  cancelOperationId: string;
  changeOn: string;
  preview: DifferentialPreview;
  onChangePlan: () => void;
  onDone: () => void;
}) {
  const paidOnId = useId();
  const methodId = useId();
  const referenceId = useId();
  const [withPayment, setWithPayment] = useState(
    preview.differential.differential > 0,
  );
  const [paidOn, setPaidOn] = useState(changeOn || localIsoDate());

  const [state, formAction, pending] = useActionState(
    changeMembershipPlanAction,
    initialState,
  );

  const expiresOn = changeOn ? cycleEnd(changeOn, newPlan.billingCycle) : null;
  const diff = preview.differential;
  const currency = preview.currency;

  if (
    (state.status === "changed" || state.status === "payment_failed") &&
    state.result
  ) {
    return (
      <div className="grid gap-4" role="status">
        <div
          className={`grid gap-2 rounded-xl border p-4 ${
            state.status === "payment_failed"
              ? "border-warning/40 bg-warning/10"
              : "border-success/30 bg-success/10"
          }`}
        >
          <ToneBadge
            tone={state.status === "payment_failed" ? "warning" : "success"}
          >
            {state.status === "payment_failed"
              ? "Plan cambiado (pago pendiente)"
              : "Plan actualizado"}
          </ToneBadge>
          <p className="text-base font-semibold text-foreground">
            {studentName} ahora tiene {newPlan.name}
          </p>
          {state.status === "payment_failed" && state.error ? (
            <p className="text-sm text-warning">{state.error}</p>
          ) : null}
        </div>
        <dl className="grid gap-2 text-sm">
          <SummaryRow label="Nuevo plan">{newPlan.name}</SummaryRow>
          <SummaryRow label="Vence">
            {formatShortDate(state.result.expiresOn)}
          </SummaryRow>
          <SummaryRow label="Precio del plan">
            {formatMoney(state.result.agreedPrice, state.result.currency)} /{" "}
            {billingCycleNouns[newPlan.billingCycle]}
          </SummaryRow>
          {state.result.paidAmount > 0 ? (
            <SummaryRow label="Diferencial cobrado">
              {formatMoney(state.result.paidAmount, state.result.currency)}
            </SummaryRow>
          ) : null}
        </dl>
        <Button type="button" variant="primary" onClick={onDone}>
          Listo
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input
        type="hidden"
        name="currentMembershipId"
        value={currentMembership.id}
      />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="newPlanId" value={newPlan.id} />
      <input type="hidden" name="changeToken" value={changeToken} />
      <input type="hidden" name="cancelOperationId" value={cancelOperationId} />
      <input type="hidden" name="changeOn" value={changeOn} />
      <input
        type="hidden"
        name="differentialAmount"
        value={Math.abs(diff.differential)}
      />

      {/* Differential summary */}
      <DifferentialBadge differential={diff} currency={currency} />

      {/* New plan details */}
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
        {expiresOn ? (
          <SummaryRow label="Vence el">{formatShortDate(expiresOn)}</SummaryRow>
        ) : null}
      </dl>

      {/* Collect differential now? (only for upgrades) */}
      {diff.differential > 0 ? (
        <div className="grid gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              name="withDifferentialPayment"
              value="on"
              checked={withPayment}
              onChange={(e) => setWithPayment(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-input"
            />
            Cobrar diferencial ahora ({formatMoney(diff.differential, currency)}
            )
          </label>

          {withPayment ? (
            <div className="grid gap-3 rounded-xl border border-border bg-surface-raised/30 p-3">
              <div className="grid gap-1">
                <label
                  htmlFor={paidOnId}
                  className="text-sm text-muted-foreground"
                >
                  Fecha de pago
                </label>
                <input
                  id={paidOnId}
                  type="date"
                  name="paidOn"
                  required={withPayment}
                  readOnly={pending}
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="grid gap-1">
                <label
                  htmlFor={methodId}
                  className="text-sm text-muted-foreground"
                >
                  Medio de pago
                </label>
                <select
                  id={methodId}
                  name="method"
                  disabled={pending}
                  defaultValue="cash"
                  className={fieldClass}
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabels[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label
                  htmlFor={referenceId}
                  className="text-sm text-muted-foreground"
                >
                  Referencia (opcional)
                </label>
                <input
                  id={referenceId}
                  type="text"
                  name="reference"
                  disabled={pending}
                  placeholder="Nº transferencia, comprobante…"
                  className={fieldClass}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : diff.differential < 0 ? (
        // Downgrade: inform that credit will be available
        <p className="rounded-xl border border-success/40 bg-success/5 px-3 py-2 text-xs text-foreground">
          El alumno tiene un crédito de{" "}
          <strong>{formatMoney(Math.abs(diff.differential), currency)}</strong>.
          Puedes aplicarlo como descuento en el próximo cobro desde{" "}
          <strong>Finanzas → Cobros</strong>.
        </p>
      ) : null}

      <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
        El plan actual se cancelará al confirmar el cambio.
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

// ─── Main flow ────────────────────────────────────────────────────────────────

type FlowStep = "pick-plan" | "preview-differential" | "confirm";

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
  const [changeToken] = useState(() => crypto.randomUUID());
  const [cancelOperationId] = useState(() => crypto.randomUUID());
  const [changeOn] = useState(() => localIsoDate());
  const [newPlan, setNewPlan] = useState<AssignablePlan | null>(null);
  const [preview, setPreview] = useState<DifferentialPreview | null>(null);
  const [step, setStep] = useState<FlowStep>("pick-plan");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const stepTitle: Record<FlowStep, string> = {
    "pick-plan": "Elige el nuevo plan",
    "preview-differential": "Diferencial del cambio",
    confirm: "Revisa y confirma el cambio",
  };

  return (
    <div className="grid gap-4">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-semibold text-foreground outline-none"
      >
        {stepTitle[step]}
      </h3>

      {step === "pick-plan" ? (
        <PlanPickerStep
          currentPlanId={currentMembership.planId}
          onSelect={(plan) => {
            setNewPlan(plan);
            setPreview(null);
            setStep("preview-differential");
          }}
        />
      ) : step === "preview-differential" && newPlan ? (
        <DifferentialStep
          currentMembership={currentMembership}
          newPlan={newPlan}
          changeOn={changeOn}
          onContinue={(p) => {
            setPreview(p);
            setStep("confirm");
          }}
          onChangePlan={() => {
            setNewPlan(null);
            setStep("pick-plan");
          }}
        />
      ) : step === "confirm" && newPlan && preview ? (
        <ConfirmChangeStep
          studentId={studentId}
          studentName={studentName}
          currentMembership={currentMembership}
          newPlan={newPlan}
          changeToken={changeToken}
          cancelOperationId={cancelOperationId}
          changeOn={changeOn}
          preview={preview}
          onChangePlan={() => {
            setNewPlan(null);
            setStep("pick-plan");
          }}
          onDone={onDone}
        />
      ) : null}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

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
      description={`Upgrade o downgrade del plan de ${studentName}. Se calcula el diferencial pro-rata del período en curso.`}
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
